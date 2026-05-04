import { searchTMDB, getSimilar, filterQuality, type TMDBMovie } from "@/lib/tmdb";

const API_KEY = "1070975-DVerseMo-572562DC";
// CORS FIX: TasteDive does not send CORS headers so direct browser fetch() calls
// are blocked. corsproxy.io makes the request server-side and returns it with
// the required Access-Control-Allow-Origin header.
const PROXY = "https://corsproxy.io/?url=";
const BASE = "https://tastedive.com/api/similar";
const CACHE_KEY = "dverse_tastedive_cache_v1";

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

// BUG FIX 1: The correct TasteDive type values are "movie" and "show" —
// not "movies" / "shows". Wrong values return an empty Results array silently.
async function getTasteDiveSuggestions(title: string, type: "movie" | "show"): Promise<string[]> {
  const clean = cleanTitle(title);
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

/**
 * BUG FIX 3: Normalize a string for comparison — lowercase, strip punctuation
 * and articles so "The Dark Knight" matches "dark knight" reliably.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * BUG FIX 3: Find the best TMDB match for a TasteDive suggestion.
 *
 * The old code did: search.value.find(r => r.media_type === mediaType && r.poster_path)
 * — i.e. just the first result of the right type. TMDB's multi-search ranks by
 * its own relevance score so the first result of the right type is often a
 * wrong foreign-language version or an entirely different title that shares a name.
 *
 * This function scores candidates by:
 *   1. Exact normalized title match → preferred
 *   2. Right media_type
 *   3. Has a poster
 *   4. Passes the same quality gate as filterQuality (vote_count >= 50)
 *
 * Without a strong title match it returns null so we don't pollute the row
 * with unrelated content.
 */
function pickBestMatch(
  results: TMDBMovie[],
  targetTitle: string,
  mediaType: "movie" | "tv",
): TMDBMovie | null {
  const target = normalize(targetTitle);

  // Only consider items of the right type with a poster that pass quality gate
  const candidates = results.filter(
    (r) => r.media_type === mediaType && r.poster_path && (r.vote_count ?? 0) >= 50,
  );

  if (!candidates.length) return null;

  // Prefer an exact normalized title match
  const exact = candidates.find((r) => normalize(r.title || r.name || "") === target);
  if (exact) return exact;

  // Accept a starts-with match (handles subtitles like "Suits: Season 1" etc.)
  const startsWith = candidates.find((r) =>
    normalize(r.title || r.name || "").startsWith(target) ||
    target.startsWith(normalize(r.title || r.name || "")),
  );
  if (startsWith) return startsWith;

  // No close match — skip this suggestion rather than returning wrong content
  return null;
}

export async function getMovieTVRecommendations(
  title: string,
  mediaType: "movie" | "tv",
  tmdbId?: number,
): Promise<TMDBMovie[]> {
  if (!title) return [];

  const cacheKey = `${mediaType}:${tmdbId || title}`;
  const cached = cache[cacheKey];

  // BUG FIX 2: Store full result objects. The original stored only IDs then
  // tried to recover them via getSimilar + intersection — almost always empty.
  if (cached && Date.now() - cached.ts < TTL && cached.results.length) {
    return cached.results;
  }

  // BUG FIX 1 (continued): "tv" maps to "show", not "shows"
  const tdType = mediaType === "movie" ? "movie" : "show";
  const suggestions = await getTasteDiveSuggestions(title, tdType);

  const results: TMDBMovie[] = [];
  if (suggestions.length > 0) {
    const searches = await Promise.allSettled(
      suggestions.map((name) => searchTMDB(name)),
    );

    for (let i = 0; i < searches.length; i++) {
      const search = searches[i];
      if (search.status !== "fulfilled" || !search.value.length) continue;

      // BUG FIX 3: Use title-similarity matching instead of "first of right type"
      const match = pickBestMatch(search.value, suggestions[i], mediaType);
      if (match && !results.some((r) => r.id === match.id)) results.push(match);
      if (results.length >= 30) break;
    }
  }

  // Fallback: if TasteDive / TMDB matching yielded nothing, use TMDB /similar
  if (results.length === 0 && tmdbId) {
    try {
      const similar = await getSimilar(tmdbId, mediaType);
      const out = filterQuality(similar).slice(0, 30);
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
