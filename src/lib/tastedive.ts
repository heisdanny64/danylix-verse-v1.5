import { searchTMDB, type TMDBMovie } from "@/lib/tmdb";
import { searchAniList, animeToCard } from "@/lib/anilist";

const API_KEY = "1070975-DVerseMo-572562DC";
const BASE = "https://tastedive.com/api/similar";

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-–—:]\s*Season\s*\d+.*/i, "")
    .replace(/\s*Season\s*\d+.*/i, "")
    .replace(/\s*Episode\s*\d+.*/i, "")
    .replace(/\s*\(.*\)\s*$/, "")
    .trim();
}

export async function getTasteDiveSuggestions(
  title: string,
  type: "movies" | "shows"
): Promise<string[]> {
  const clean = cleanTitle(title);
  const url = `${BASE}?q=${encodeURIComponent(clean)}&type=${type}&limit=12&k=${API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.Similar?.Results || []).map((r: { Name: string }) => r.Name);
  } catch {
    console.warn("[TasteDive] fetch failed for:", clean);
    return [];
  }
}

// Movie/TV: TasteDive → TMDB enrichment
export async function getMovieTVRecommendations(
  title: string,
  mediaType: "movie" | "tv"
): Promise<TMDBMovie[]> {
  const tdType = mediaType === "movie" ? "movies" : "shows";
  const suggestions = await getTasteDiveSuggestions(title, tdType);
  if (suggestions.length === 0) return [];

  const results: TMDBMovie[] = [];
  // Search TMDB for each suggestion in parallel (batched)
  const searches = await Promise.allSettled(
    suggestions.map((name) => searchTMDB(name))
  );

  for (const search of searches) {
    if (search.status !== "fulfilled" || !search.value.length) continue;
    // Pick first result that matches mediaType and has a poster
    const match = search.value.find(
      (r) => r.media_type === mediaType && r.poster_path
    );
    if (match && !results.some((r) => r.id === match.id)) {
      results.push(match);
    }
    if (results.length >= 12) break;
  }

  return results.slice(0, 12);
}

// Anime: AniList recs + TasteDive → AniList validation
export async function getAnimeRecommendationsFromTasteDive(
  title: string
): Promise<TMDBMovie[]> {
  const suggestions = await getTasteDiveSuggestions(title, "shows");
  if (suggestions.length === 0) return [];

  const results: TMDBMovie[] = [];
  const searches = await Promise.allSettled(
    suggestions.map((name) => searchAniList(name, 3))
  );

  for (const search of searches) {
    if (search.status !== "fulfilled" || !search.value.length) continue;
    const card = animeToCard(search.value[0]);
    if (!results.some((r) => r.id === card.id)) {
      results.push(card);
    }
    if (results.length >= 12) break;
  }

  return results.slice(0, 12);
}
