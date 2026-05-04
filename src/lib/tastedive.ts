import { searchTMDB, getSimilar, type TMDBMovie } from "@/lib/tmdb";

const API_KEY = "1070975-DVerseMo-572562DC";
const BASE = "https://tastedive.com/api/similar";
const CACHE_KEY = "dverse_tastedive_cache_v1";

type Cache = Record<string, { ts: number; ids: number[] }>;
const TTL = 30 * 60 * 1000;

function loadCache(): Cache {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "{}"); }
  catch { return {}; }
}
function saveCache(c: Cache) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* noop */ }
}
const cache: Cache = loadCache();

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-–—:]\s*Season\s*\d+.*/i, "")
    .replace(/\s*Season\s*\d+.*/i, "")
    .replace(/\s*Episode\s*\d+.*/i, "")
    .replace(/\s*\(.*\)\s*$/, "")
    .trim();
}

async function getTasteDiveSuggestions(title: string, type: "movies" | "shows"): Promise<string[]> {
  const clean = cleanTitle(title);
  const url = `${BASE}?q=${encodeURIComponent(clean)}&type=${type}&limit=30&k=${API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.Similar?.Results || []).map((r: { Name: string }) => r.Name);
  } catch {
    return [];
  }
}

export async function getMovieTVRecommendations(
  title: string,
  mediaType: "movie" | "tv",
  tmdbId?: number,
): Promise<TMDBMovie[]> {
  const cacheKey = `${mediaType}:${tmdbId || title}`;
  const cached = cache[cacheKey];
  // Note: result IDs only — we re-search TMDB by title each time which is fine and small.
  // Actually return cached items via a parallel TMDB id lookup is overkill; re-run logic but skip TasteDive if cached recently.

  if (cached && Date.now() - cached.ts < TTL && cached.ids.length) {
    // shallow: we don't store full objects; refetch /similar fast path
    try {
      if (tmdbId) {
        const sim = await getSimilar(tmdbId, mediaType);
        const set = new Set(cached.ids);
        const ordered = sim.filter((s) => set.has(s.id));
        if (ordered.length) return ordered.slice(0, 30);
      }
    } catch { /* fall through */ }
  }

  const tdType = mediaType === "movie" ? "movies" : "shows";
  const suggestions = await getTasteDiveSuggestions(title, tdType);

  const results: TMDBMovie[] = [];
  if (suggestions.length > 0) {
    const searches = await Promise.allSettled(suggestions.map((name) => searchTMDB(name)));
    for (const search of searches) {
      if (search.status !== "fulfilled" || !search.value.length) continue;
      const match = search.value.find((r) => r.media_type === mediaType && r.poster_path);
      if (match && !results.some((r) => r.id === match.id)) results.push(match);
      if (results.length >= 30) break;
    }
  }

  if (results.length === 0 && tmdbId) {
    try {
      const similar = await getSimilar(tmdbId, mediaType);
      const out = similar.filter((r) => r.poster_path).slice(0, 30);
      cache[cacheKey] = { ts: Date.now(), ids: out.map((r) => r.id) };
      saveCache(cache);
      return out;
    } catch {
      return [];
    }
  }

  cache[cacheKey] = { ts: Date.now(), ids: results.map((r) => r.id) };
  saveCache(cache);
  return results.slice(0, 30);
}
