import { supabase } from "@/integrations/supabase/client";

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
  type?: string;
}

interface GiftedSourcesResponse {
  results?: GiftedSource[];
  subtitles?: GiftedSubtitle[];
}

const SUBJECT_CACHE_KEY = "dverse_gifted_subject_cache";
const ANIME_OFFSET_CACHE_KEY = "dverse_anime_episode_offsets";

function loadCache<T extends Record<string, any>>(key: string): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

function saveCache(key: string, value: Record<string, any>) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

async function callProxy<T>(path: string, query: Record<string, string | number> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("gifted-proxy", {
    body: { path, query },
  });
  if (error) throw new Error(error.message || "Proxy request failed");
  return data as T;
}

/** Normalize titles for fuzzy matching. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(season|saison|part|cour|stagione)\s*\d+\b/g, "")
    .replace(/\b(s|p)\d+\b/g, "")
    .replace(/\b(i{1,3}|iv|v|vi{0,3}|ix|x)\b$/g, "")
    .replace(/[:\-–—_().,!?'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const A = normalizeTitle(a);
  const B = normalizeTitle(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  // Token Jaccard
  const ta = new Set(A.split(" "));
  const tb = new Set(B.split(" "));
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
      imageUrl: r.cover?.url || r.thumbnail,
      rating: r.imdbRatingValue ? Number(r.imdbRatingValue) : undefined,
      type: r.subjectType === 1 ? "movie" : r.subjectType === 2 ? "tv" : undefined,
    })) as GiftedSearchItem[];
  } catch {
    return [];
  }
}

export interface MatchOptions {
  title: string;
  year?: number | null;
  type?: "movie" | "tv" | "anime";
  externalId: number; // tmdb or anilist id
}

export async function findBestMatch(opts: MatchOptions): Promise<string | number | null> {
  const cacheKey = `${opts.type || "x"}:${opts.externalId}`;
  const cache = loadCache<Record<string, string | number | null>>(SUBJECT_CACHE_KEY);
  if (cacheKey in cache) return cache[cacheKey];

  const baseTitle = normalizeTitle(opts.title);
  const queries = Array.from(new Set([opts.title, baseTitle].filter(Boolean)));

  let best: { id: string | number; score: number } | null = null;

  for (const q of queries) {
    const results = await searchGifted(q);
    for (const r of results) {
      if (!r?.subjectId) continue;
      const sim = similarity(opts.title, r.title || "");
      let score = sim;
      if (opts.year) {
        const ry = Number(
          r.year || (r.releaseDate ? r.releaseDate.slice(0, 4) : 0),
        );
        if (ry) {
          const diff = Math.abs(ry - opts.year);
          if (diff === 0) score += 0.2;
          else if (diff <= 1) score += 0.1;
          else if (diff > 3) score -= 0.15;
        }
      }
      if (!best || score > best.score) {
        best = { id: r.subjectId, score };
      }
    }
    if (best && best.score >= 0.85) break;
  }

  const picked = best && best.score >= 0.4 ? best.id : null;
  cache[cacheKey] = picked;
  saveCache(SUBJECT_CACHE_KEY, cache);
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

/** Compute the absolute episode number for an anime sequel.
 *  Walks AniList prequel chain and sums episodes of all prior entries.
 */
export async function resolveAnimeEpisode(
  anilistId: number,
  episode: number,
): Promise<number> {
  const cache = loadCache<Record<string, number>>(ANIME_OFFSET_CACHE_KEY);
  const key = String(anilistId);
  if (key in cache) return episode + cache[key];

  const ANILIST_URL = "https://graphql.anilist.co";
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        episodes
        relations { edges { relationType node { id type format episodes } } }
      }
    }
  `;

  let offset = 0;
  const visited = new Set<number>();
  let currentId: number | null = anilistId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    try {
      const res = await fetch(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { id: currentId } }),
      });
      const json = await res.json();
      const edges = json?.data?.Media?.relations?.edges || [];
      const prequel = edges.find(
        (e: any) =>
          e.relationType === "PREQUEL" &&
          e.node?.type === "ANIME" &&
          ["TV", "TV_SHORT"].includes(e.node?.format),
      );
      if (prequel?.node) {
        offset += prequel.node.episodes || 0;
        currentId = prequel.node.id;
      } else {
        currentId = null;
      }
    } catch {
      currentId = null;
    }
  }

  cache[key] = offset;
  saveCache(ANIME_OFFSET_CACHE_KEY, cache);
  return episode + offset;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(2)} MB`;
}

/**
 * If a stream URL points to a redirect/proxy with an `?url=` param that
 * itself is the actual playable file, return the decoded direct URL.
 * Otherwise return null.
 */
export function extractDirectUrl(streamUrl: string): string | null {
  try {
    const u = new URL(streamUrl);
    const inner = u.searchParams.get("url");
    if (!inner) return null;
    const decoded = decodeURIComponent(inner);
    // Sanity check: must look like an absolute http(s) URL
    if (!/^https?:\/\//i.test(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}