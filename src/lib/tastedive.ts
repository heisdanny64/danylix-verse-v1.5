import { searchTMDB, getSimilar, type TMDBMovie } from "@/lib/tmdb";

const API_KEY = "1070975-DVerseMo-572562DC";
const BASE = "https://tastedive.com/api/similar";
const CACHE_KEY = "dverse_tastedive_cache_v1";

// Store full result objects so cache hits don't need a network round-trip
type Cache = Record<string, { ts: number; results: TMDBMovie[] }>;
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

  // BUG FIX 1: TasteDive does not send CORS headers for plain JSON requests,
  // causing the browser to block the response silently.
  // Adding `callback=1` switches TasteDive to a CORS-safe response mode.
  // We then strip the JSONP wrapper before parsing.
  const url = `${BASE}?q=${encodeURIComponent(clean)}&type=${type}&limit=30&info=0&callback=1&k=${API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    // The callback=1 response is wrapped: `callback({"Similar": {...}})` — strip it.
    const text = await res.text();
    const jsonStr = text.replace(/^[^(]+\(/, "").replace(/\);?\s*$/, "");
    const data = JSON.parse(jsonStr);

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
  if (!title) return [];

  const cacheKey = `${mediaType}:${tmdbId || title}`;
  const cached = cache[cacheKey];

  // BUG FIX 2: Cache now stores full result objects, so hits return immediately
  // without a network round-trip. Previously it stored only IDs and tried to
  // cross-reference TMDB's own /similar list, which rarely overlapped.
  if (cached && Date.now() - cached.ts < TTL && cached.results.length) {
    return cached.results;
  }

  const tdType = mediaType === "movie" ? "movies" : "shows";
  const suggestions = await getTasteDiveSuggestions(title, tdType);

  const results: TMDBMovie[] = [];
  if (suggestions.length > 0) {
    const searches = await Promise.allSettled(suggestions.map((name) => searchTMDB(name)));
    for (const search of searches) {
      if (search.status !== "fulfilled" || !search.value.length) continue;

      // BUG FIX 3: `searchTMDB` may use a type-specific endpoint that doesn't
      // populate `media_type` on each result. Fall back to accepting the first
      // result with a poster when `media_type` is absent.
      const match =
        search.value.find((r) => r.media_type === mediaType && r.poster_path) ??
        search.value.find((r) => r.poster_path);

      if (match && !results.some((r) => r.id === match.id)) results.push(match);
      if (results.length >= 30) break;
    }
  }

  // Fallback: if TasteDive yielded nothing, use TMDB's own /similar endpoint
  if (results.length === 0 && tmdbId) {
    try {
      const similar = await getSimilar(tmdbId, mediaType);
      const out = similar.filter((r) => r.poster_path).slice(0, 30);
      cache[cacheKey] = { ts: Date.now(), results: out };
      saveCache(cache);
      return out;
    } catch {
      return [];
    }
  }

  const out = results.slice(0, 30);
  cache[cacheKey] = { ts: Date.now(), results: out };
  saveCache(cache);
  return out;
}
