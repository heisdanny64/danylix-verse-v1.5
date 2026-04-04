import { searchTMDB, getSimilar, type TMDBMovie } from "@/lib/tmdb";
import { searchAniList, getAnimeRecommendations as getAniListRecs, animeToCard } from "@/lib/anilist";

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
  const url = `${BASE}?q=${encodeURIComponent(clean)}&type=${type}&limit=20&k=${API_KEY}`;
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

// Movie/TV: TasteDive → TMDB enrichment, with TMDB fallback
export async function getMovieTVRecommendations(
  title: string,
  mediaType: "movie" | "tv",
  tmdbId?: number
): Promise<TMDBMovie[]> {
  const tdType = mediaType === "movie" ? "movies" : "shows";
  const suggestions = await getTasteDiveSuggestions(title, tdType);

  const results: TMDBMovie[] = [];

  if (suggestions.length > 0) {
    const searches = await Promise.allSettled(
      suggestions.map((name) => searchTMDB(name))
    );

    for (const search of searches) {
      if (search.status !== "fulfilled" || !search.value.length) continue;
      const match = search.value.find(
        (r) => r.media_type === mediaType && r.poster_path
      );
      if (match && !results.some((r) => r.id === match.id)) {
        results.push(match);
      }
      if (results.length >= 20) break;
    }
  }

  // Failsafe: if TasteDive returned nothing, use TMDB similar
  if (results.length === 0 && tmdbId) {
    try {
      const similar = await getSimilar(tmdbId, mediaType);
      return similar.filter(r => r.poster_path).slice(0, 20);
    } catch {
      return [];
    }
  }

  return results.slice(0, 20);
}

// Anime: AniList recs + TasteDive → AniList validation
export async function getAnimeRecommendationsFromTasteDive(
  title: string,
  anilistId?: number
): Promise<TMDBMovie[]> {
  // Step 1 & 2: Fetch AniList native recs + TasteDive in parallel
  const [anilistResult, suggestions] = await Promise.all([
    anilistId ? getAniListRecs(anilistId).catch(() => []) : Promise.resolve([]),
    getTasteDiveSuggestions(title, "shows"),
  ]);

  const anilistCards = anilistResult.map(animeToCard);

  // Step 3: Validate TasteDive results via AniList
  const tdCards: TMDBMovie[] = [];
  if (suggestions.length > 0) {
    const searches = await Promise.allSettled(
      suggestions.map((name) => searchAniList(name, 3))
    );
    for (const search of searches) {
      if (search.status !== "fulfilled" || !search.value.length) continue;
      const card = animeToCard(search.value[0]);
      if (!tdCards.some((r) => r.id === card.id)) {
        tdCards.push(card);
      }
    }
  }

  // Step 4: Merge and deduplicate
  const seen = new Set<number>();
  const merged: TMDBMovie[] = [];
  for (const card of [...anilistCards, ...tdCards]) {
    if (!seen.has(card.id) && card.id !== anilistId) {
      seen.add(card.id);
      merged.push(card);
    }
    if (merged.length >= 20) break;
  }

  return merged;
}
