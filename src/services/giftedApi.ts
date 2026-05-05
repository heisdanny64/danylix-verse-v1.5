import { supabase } from "@/integrations/supabase/client";
import { normalizeTitle as canonicalize, giftedToMediaItem, type MediaItem } from "@/lib/media";

export interface GiftedSource {
  quality: string;
  stream_url: string;
  download_url: string;
  size: number;
}

export interface GiftedSubtitle {
  lan: string;
  lanName: string;
  url: string;
}

export interface GiftedSearchItem {
  subjectId: string | number;
  title: string;
  releaseDate?: string;
  year?: number | string;
  imageUrl?: string;
  rating?: number;
  type?: "movie" | "tv";
  genres?: string[];
  cast?: { name: string; character?: string; profile?: string }[];
  overview?: string;
}

interface GiftedSourcesResponse {
  results?: GiftedSource[];
  subtitles?: GiftedSubtitle[];
}

const SUBJECT_CACHE_KEY = "dverse_gifted_subject_cache_v4";

function loadCache<T extends Record<string, any>>(key: string): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch { return {} as T; }
}
function saveCache(key: string, value: Record<string, any>) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

async function callProxy<T>(path: string, query: Record<string, string | number> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("gifted-proxy", { body: { path, query } });
  if (error) throw new Error(error.message || "Proxy request failed");
  return data as T;
}

export function normalizeTitle(title: string): string {
  return canonicalize(title);
}

function tokenJaccard(a: string, b: string): number {
  const A = normalizeTitle(a);
  const B = normalizeTitle(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const ta = new Set(A.split(" ").filter(Boolean));
  const tb = new Set(B.split(" ").filter(Boolean));
  const inter = [...ta].filter((t) => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  return union ? inter / union : 0;
}

export async function searchGifted(query: string, page = 1): Promise<GiftedSearchItem[]> {
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  try {
    const data = await callProxy<any>(`search/${q}`, { page });
    const list = Array.isArray(data?.results?.items)
      ? data.results.items
      : Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
    return list.map((r: any) => ({
      subjectId: r.subjectId ?? r.id,
      title: r.title || "",
      releaseDate: r.releaseDate,
      year: r.releaseDate ? Number(String(r.releaseDate).slice(0, 4)) : undefined,
      imageUrl: r.cover?.url || r.thumbnail || r.imageUrl,
      rating: r.imdbRatingValue ? Number(r.imdbRatingValue) : undefined,
      type: r.subjectType === 1 ? "movie" : r.subjectType === 2 ? "tv" : undefined,
      genres: Array.isArray(r.genre) ? r.genre : Array.isArray(r.genres) ? r.genres : undefined,
      cast: Array.isArray(r.cast) ? r.cast : undefined,
      overview: r.description || r.overview,
    })) as GiftedSearchItem[];
  } catch {
    return [];
  }
}

/** Fetch Gifted Nollywood items, normalized + flagged. */
export async function getNollywoodFromGifted(page = 1): Promise<MediaItem[]> {
  const items = await searchGifted("Nollywood", page);
  return items.map(giftedToMediaItem).map((m) => {
    const lower = (m.title || "").toLowerCase();
    const onlyDrama =
      Array.isArray((items.find((g) => String(g.subjectId) === m.id) as any)?.genres) &&
      (items.find((g) => String(g.subjectId) === m.id) as any).genres.length === 1 &&
      String((items.find((g) => String(g.subjectId) === m.id) as any).genres[0]).toLowerCase() === "drama";
    if (lower.includes("nollywood") || onlyDrama) m.isNollywood = true;
    return m;
  });
}

export interface MatchOptions {
  title: string;
  year?: number | null;
  type?: "movie" | "tv";
  externalId: number;
  episodeCount?: number | null;
}

export async function findBestMatch(opts: MatchOptions): Promise<string | number | null> {
  const cacheKey = `${opts.type || "x"}:${opts.externalId}`;
  const cache = loadCache<Record<string, string | number | null>>(SUBJECT_CACHE_KEY);
  // Only return early for positive cached matches. Null entries fall through so
  // a transient upstream miss doesn't permanently disable streaming for a title.
  if (cacheKey in cache && cache[cacheKey] != null) return cache[cacheKey];

  const targetNorm = normalizeTitle(opts.title);
  // Deduplicate: if normalizeTitle produces the same string, only search once.
  const queries = Array.from(new Set(
    [opts.title, targetNorm].filter(Boolean)
  ));
  const queryHasVariant = /\b(english|dub|dubbed|sub|subbed|raw|japanese)\b/i.test(opts.title || "");

  let best: { id: string | number; score: number } | null = null;
  let exact: { id: string | number; score: number } | null = null;

  const scoreCandidate = (r: GiftedSearchItem) => {
    if (!r?.subjectId) return;
    const sim = tokenJaccard(opts.title, r.title || "");
    if (sim < 0.3) return; // pre-filter

    let score = sim;
    const rTitle = r.title || "";

    // Penalize variant tokens unless the query asked for them
    if (!queryHasVariant && /\b(english|dub|dubbed|sub|subbed|raw|japanese)\b/i.test(rTitle)) {
      score -= 0.25;
    }
    // Penalize season bundle titles (e.g. "Breaking Bad Season 1-3")
    if (/\b(s\d+(\s*-\s*s?\d+)?|season\s?\d+)\b/i.test(rTitle)) {
      score -= 0.4;
    }

    // Year — r.year is already extracted from releaseDate in searchGifted()
    if (opts.year) {
      const ry = Number(r.year ?? 0);
      if (ry) {
        const diff = Math.abs(ry - opts.year);
        if (diff > 2) return; // reject clearly wrong year
        score += diff === 0 ? 0.25 : diff === 1 ? 0.1 : 0;
      } else {
        score -= 0.05; // small penalty for missing year
      }
    }

    // Type — bonus for match, penalty for mismatch
    if (opts.type && r.type) {
      score += r.type === opts.type ? 0.1 : -0.35;
    }

    if (normalizeTitle(rTitle) === targetNorm) {
      if (!exact || score > exact.score) exact = { id: r.subjectId, score };
    }
    if (!best || score > best.score) best = { id: r.subjectId, score };
  };

  for (const q of queries) {
    const results = await searchGifted(q, 1);
    results.forEach(scoreCandidate);
    // If we already have a very confident match, stop early
    if (best && best.score >= 0.95) break;
  }

  // If no confident winner yet, try page 2 of the first query — some titles
  // appear deeper in Gifted's results (especially older or less popular content)
  if ((!best || best.score < 0.7) && queries[0]) {
    const page2 = await searchGifted(queries[0], 2);
    page2.forEach(scoreCandidate);
  }

  const winner = exact ?? best;
  const picked = winner && winner.score >= 0.65 ? winner.id : null;
  if (picked != null) {
    cache[cacheKey] = picked;
    saveCache(SUBJECT_CACHE_KEY, cache);
  }
  return picked;
}

export async function getGiftedSources(
  subjectId: string | number,
  season?: number,
  episode?: number,
): Promise<GiftedSourcesResponse> {
  const query: Record<string, string | number> = {};
  if (season != null) query.season = season;
  if (episode != null) query.episode = episode;
  try {
    const data = await callProxy<any>(`sources/${subjectId}`, query);
    const results = Array.isArray(data?.results)
      ? data.results.map((s: any) => ({
          quality: String(s.quality || ""),
          stream_url: String(s.stream_url || ""),
          download_url: String(s.download_url || ""),
          size: typeof s.size === "string" ? Number(s.size) : Number(s.size || 0),
        }))
      : [];
    const subtitles = Array.isArray(data?.subtitles)
      ? data.subtitles.map((s: any) => ({
          lan: String(s.lan || "en"),
          lanName: String(s.lanName || s.lan || "Subtitle"),
          url: String(s.url || ""),
        }))
      : [];
    return { results, subtitles };
  } catch {
    return { results: [], subtitles: [] };
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(2)} MB`;
}

export interface GiftedInfo {
  subjectId: string | number;
  title: string;
  overview?: string;
  year?: number;
  rating?: number;
  imageUrl?: string;
  coverUrl?: string;
  type?: "movie" | "tv";
  genres?: string[];
  runtime?: number;
  stars?: { name: string; character?: string; profile?: string }[];
  seasons?: { season_number: number; episode_count: number; name?: string }[];
}

/** Fetch unified info for a Gifted subject (used by DetailsPage when source=gifted). */
export async function getGiftedInfo(subjectId: string | number): Promise<GiftedInfo | null> {
  try {
    const data = await callProxy<any>(`info/${subjectId}`, {});
    // The info endpoint returns: { results: { subject: {...}, stars: [...], resource: {...} } }
    const results = data?.results;
    const r = results?.subject || data?.result || data?.data || data;
    if (!r) return null;

    // stars live at results.stars (sibling of subject), not inside r itself
    const rawStars = Array.isArray(results?.stars)
      ? results.stars
      : Array.isArray(r.stars)
        ? r.stars
        : Array.isArray(r.cast)
          ? r.cast
          : [];
    const normalizedStars = rawStars.map((s: any) =>
      typeof s === "string"
        ? { name: s }
        : {
            name: s.name || s.actor || "",
            character: s.character || s.role,
            // Gifted uses avatarUrl for cast profile images
            profile: s.avatarUrl || s.profile || s.image || null,
          },
    );

    // genre comes as a comma-separated string e.g. "Action,Adventure,Drama"
    let genres: string[] | undefined;
    if (Array.isArray(r.genre)) {
      genres = r.genre;
    } else if (Array.isArray(r.genres)) {
      genres = r.genres;
    } else if (typeof r.genre === "string" && r.genre) {
      genres = r.genre.split(",").map((g: string) => g.trim()).filter(Boolean);
    } else if (typeof r.genres === "string" && r.genres) {
      genres = r.genres.split(",").map((g: string) => g.trim()).filter(Boolean);
    }

    // seasons live at results.resource.seasons in the Gifted info response
    const resourceSeasons = results?.resource?.seasons;
    let seasons: GiftedInfo["seasons"] | undefined;
    if (Array.isArray(r.seasons)) {
      seasons = r.seasons.map((s: any, i: number) => ({
        season_number: Number(s.season_number ?? s.season ?? i + 1),
        episode_count: Number(s.episode_count ?? (Array.isArray(s.episodes) ? s.episodes.length : 0)),
        name: s.name || `Season ${s.season_number ?? i + 1}`,
      }));
    } else if (Array.isArray(resourceSeasons)) {
      // resource.seasons entries: { se: 1, maxEp: 13, allEp: "...", resolutions: [...] }
      seasons = resourceSeasons
        .filter((s: any) => Number(s.se ?? s.season_number ?? 1) > 0)
        .map((s: any, i: number) => {
          const seasonNum = Number(s.se ?? s.season_number ?? i + 1);
          const epCount = Number(s.maxEp ?? s.episode_count ?? 0);
          return {
            season_number: seasonNum,
            episode_count: epCount,
            name: s.name || `Season ${seasonNum}`,
          };
        });
    } else if (r.totalSeasons) {
      seasons = Array.from({ length: Number(r.totalSeasons) }, (_, i) => ({
        season_number: i + 1,
        episode_count: 0,
        name: `Season ${i + 1}`,
      }));
    }

    return {
      subjectId: r.subjectId ?? r.id ?? subjectId,
      title: r.title || "",
      overview: r.description || r.overview,
      year: r.releaseDate ? Number(String(r.releaseDate).slice(0, 4)) : (r.year ? Number(r.year) : undefined),
      rating: r.imdbRatingValue ? Number(r.imdbRatingValue) : (r.rating ? Number(r.rating) : undefined),
      imageUrl: r.cover?.url || r.thumbnail || r.imageUrl,
      coverUrl: r.stills?.url || r.cover?.url || r.backdrop || r.imageUrl,
      type: r.subjectType === 2 ? "tv" : r.subjectType === 1 ? "movie" : (Array.isArray(seasons) && seasons.length > 0 ? "tv" : "movie"),
      genres,
      runtime: r.duration ? Math.round(Number(r.duration) / 60) : (r.runtime ? Number(r.runtime) : undefined),
      stars: normalizedStars,
      seasons,
    };
  } catch {
    return null;
  }
}

/** Fetch single Gifted subject details (used by Nollywood detail page). */
export async function getGiftedSubject(subjectId: string | number): Promise<GiftedSearchItem | null> {
  try {
    const data = await callProxy<any>(`subject/${subjectId}`, {});
    const r = data?.result || data?.data || data;
    if (!r) return null;
    return {
      subjectId: r.subjectId ?? r.id ?? subjectId,
      title: r.title || "",
      releaseDate: r.releaseDate,
      year: r.releaseDate ? Number(String(r.releaseDate).slice(0, 4)) : undefined,
      imageUrl: r.cover?.url || r.thumbnail || r.imageUrl,
      rating: r.imdbRatingValue ? Number(r.imdbRatingValue) : undefined,
      type: r.subjectType === 1 ? "movie" : r.subjectType === 2 ? "tv" : undefined,
      genres: Array.isArray(r.genre) ? r.genre : Array.isArray(r.genres) ? r.genres : undefined,
      cast: Array.isArray(r.cast) ? r.cast : undefined,
      overview: r.description || r.overview,
    };
  } catch {
    return null;
  }
}
