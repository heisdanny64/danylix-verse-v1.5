import { searchTMDB, getSimilar, filterQuality, type TMDBMovie } from "@/lib/tmdb";

const API_KEY = "1070975-DVerseMo-572562DC";
/**
 * CORS FIX: TasteDive does not send CORS headers.
 * We use a list of proxies to ensure reliability.
 * api.codetabs.com is currently working well for JSON responses.
 */
const PROXY_URLS = [
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://api.allorigins.win/raw?url=",
  "https://corsproxy.io/?url=",
];
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

async function getTasteDiveSuggestions(title: string, type: "movie" | "show"): Promise<string[]> {
  const clean = cleanTitle(title);
  const params = new URLSearchParams({
    q: clean,
    type: type,
    k: API_KEY,
    limit: "20"
  });
  const targetUrl = `${BASE}?${params.toString()}`;
  
  for (const proxy of PROXY_URLS) {
    const url = `${proxy}${encodeURIComponent(targetUrl)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      
      const text = await res.text();
      // Some proxies might return HTML error pages with 200 status
      if (text.trim().startsWith("<!DOCTYPE")) continue;
      
      const data = JSON.parse(text);
      // TasteDive returns { Similar: { Results: [...] } }
      const similar = data?.Similar || data?.similar;
      const results = (similar?.Results || similar?.results || []).map((r: { Name?: string; name?: string }) => r.Name || r.name || "");
      
      if (results.length > 0) return results;
    } catch (e) {
      console.error(`TasteDive proxy error (${proxy}):`, e);
      continue;
    }
  }
  return [];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickBestMatch(
  results: TMDBMovie[],
  targetTitle: string,
  mediaType: "movie" | "tv",
): TMDBMovie | null {
  const target = normalize(targetTitle);

  // Filter by type and poster
  const candidates = results.filter(
    (r) => (r.media_type === mediaType || !r.media_type) && r.poster_path
  );

  if (!candidates.length) return null;

  // 1. Exact normalized title match
  const exact = candidates.find((r) => normalize(r.title || r.name || "") === target);
  if (exact) return exact;

  // 2. Starts-with match
  const startsWith = candidates.find((r) => {
    const rTitle = normalize(r.title || r.name || "");
    return rTitle.startsWith(target) || target.startsWith(rTitle);
  });
  if (startsWith) return startsWith;

  // 3. If no strong match, return the first candidate of the right type if it exists
  return candidates[0] || null;
}

export async function getMovieTVRecommendations(
  title: string,
  mediaType: "movie" | "tv",
  tmdbId?: number,
): Promise<TMDBMovie[]> {
  if (!title) return [];

  const cacheKey = `${mediaType}:${tmdbId || title}`;
  const cached = cache[cacheKey];

  if (cached && Date.now() - cached.ts < TTL && cached.results.length) {
    return cached.results;
  }

  const tdType = mediaType === "movie" ? "movie" : "show";
  const suggestions = await getTasteDiveSuggestions(title, tdType);

  const results: TMDBMovie[] = [];
  if (suggestions.length > 0) {
    // Process in batches to avoid hitting TMDB rate limits too hard
    const batchSize = 5;
    for (let i = 0; i < suggestions.length; i += batchSize) {
      const batch = suggestions.slice(i, i + batchSize);
      const searches = await Promise.allSettled(
        batch.map((name) => searchTMDB(name)),
      );

      for (let j = 0; j < searches.length; j++) {
        const search = searches[j];
        if (search.status !== "fulfilled" || !search.value.length) continue;

        const match = pickBestMatch(search.value, batch[j], mediaType);
        if (match && !results.some((r) => r.id === match.id)) {
          results.push({ ...match, media_type: mediaType });
        }
      }
      if (results.length >= 20) break;
    }
  }

  // Fallback: if TasteDive / TMDB matching yielded nothing, use TMDB /similar
  if (results.length === 0 && tmdbId) {
    try {
      const similar = await getSimilar(tmdbId, mediaType);
      const out = filterQuality(similar).slice(0, 20).map(m => ({ ...m, media_type: mediaType }));
      cache[cacheKey] = { ts: Date.now(), results: out };
      saveCache(cache);
      return out;
    } catch {
      return [];
    }
  }

  const out = results.slice(0, 20);
  cache[cacheKey] = { ts: Date.now(), results: out };
  saveCache(cache);
  return out;
}
