import { searchTMDB, getSimilar, type TMDBMovie } from "@/lib/tmdb";

const API_KEY = "1070975-DVerseMo-572562DC";
// CORS FIX: Route through a CORS proxy. TasteDive does not send CORS headers,
// so direct browser fetches are blocked. corsproxy.io forwards the request
// server-side and returns the response with CORS headers attached.
const PROXY = "https://corsproxy.io/?url=";
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

// BUG FIX 1: The type values the API actually accepts are "movie" and "show",
// NOT "movies" / "shows". Using the wrong values caused TasteDive to return
// an empty Results array every time, making the whole pipeline silently fail.
async function getTasteDiveSuggestions(title: string, type: "movie" | "show"): Promise<string[]> {
  const clean = cleanTitle(title);

  // BUG FIX 2: TasteDive does not set CORS headers, so direct fetch() calls
  // from the browser are silently blocked. We prefix the URL with a CORS proxy
  // so the request is made server-side and returned with the required
  // Access-Control-Allow-Origin header.
  const targetUrl = `${BASE}?q=${encodeURIComponent(clean)}&type=${type}&limit=30&k=${API_KEY}`;
  const url = `${PROXY}${encodeURIComponent(targetUrl)}`;

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
  if (!title) return [];

  const cacheKey = `${mediaType}:${tmdbId || title}`;
  const cached = cache[cacheKey];

  // BUG FIX 3: Cache now stores full result objects so hits return immediately.
  // The original stored only IDs, then tried to recover objects by calling
  // getSimilar (TMDB's own endpoint) and intersecting — but that list rarely
  // overlaps with TasteDive's, so the intersection was almost always empty and
  // the full pipeline re-ran on every page visit.
  if (cached && Date.now() - cached.ts < TTL && cached.results.length) {
    return cached.results;
  }

  // BUG FIX 1 (continued): map "tv" → "show", not "shows"
  const tdType = mediaType === "movie" ? "movie" : "show";
  const suggestions = await getTasteDiveSuggestions(title, tdType);

  const results: TMDBMovie[] = [];
  if (suggestions.length > 0) {
    const searches = await Promise.allSettled(suggestions.map((name) => searchTMDB(name)));
    for (const search of searches) {
      if (search.status !== "fulfilled" || !search.value.length) continue;

      // BUG FIX 4: If searchTMDB uses a type-scoped endpoint (e.g. /search/movie
      // instead of /search/multi), results won't have a media_type field and the
      // strict equality check silently drops every candidate. Fall back to the
      // first result with a poster_path when media_type is absent.
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
