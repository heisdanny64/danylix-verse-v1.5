const API_KEY = "eb81f29c8c34e05a51e64378606495c0";
const BASE = "https://api.themoviedb.org/3";

export const IMG_BASE = "https://image.tmdb.org/t/p";
export const posterUrl = (path: string | null, size = "w342") =>
  path ? `${IMG_BASE}/${size}${path}` : "/placeholder.svg";
export const backdropUrl = (path: string | null, size = "w780") =>
  path ? `${IMG_BASE}/${size}${path}` : "/placeholder.svg";

export interface TMDBMovie {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  media_type?: string;
  original_language?: string;
}

export interface TMDBMovieDetail {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genres: { id: number; name: string }[];
  runtime?: number;
  tagline?: string;
  number_of_seasons?: number;
  seasons?: TMDBSeason[];
}

export interface TMDBSeason {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  air_date: string | null;
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  runtime: number | null;
  air_date: string | null;
  vote_average: number;
}

export interface TMDBSeasonDetail {
  id: number;
  name: string;
  season_number: number;
  episodes: TMDBEpisode[];
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

export async function getTrending(mediaType: "movie" | "tv" | "all" = "all", timeWindow: "day" | "week" = "week") {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/trending/${mediaType}/${timeWindow}`);
  return data.results;
}

export async function getPopular(mediaType: "movie" | "tv" = "movie") {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/${mediaType}/popular`);
  return data.results;
}

export async function getTopRated(mediaType: "movie" | "tv" = "movie") {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/${mediaType}/top_rated`);
  return data.results;
}

export async function getByGenre(genreId: number, mediaType: "movie" | "tv" = "movie") {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, {
    with_genres: String(genreId),
    sort_by: "popularity.desc",
  });
  return data.results;
}

export async function getByGenreAndLanguage(genreId: number, language: string, mediaType: "movie" | "tv" = "tv") {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, {
    with_genres: String(genreId),
    with_original_language: language,
    sort_by: "popularity.desc",
  });
  return data.results;
}

export async function getByLanguage(language: string, mediaType: "movie" | "tv" = "tv") {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, {
    with_original_language: language,
    sort_by: "popularity.desc",
  });
  return data.results;
}

export async function getHiddenGems(mediaType: "movie" | "tv" = "movie") {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, {
    sort_by: "vote_average.desc",
    "vote_count.gte": "50",
    "vote_count.lte": "500",
    "vote_average.gte": "7.5",
  });
  return data.results;
}

export async function searchTMDB(query: string) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/search/multi", { query });
  return data.results.filter((r) => r.media_type === "movie" || r.media_type === "tv");
}

export async function getMovieDetails(id: number, mediaType: "movie" | "tv" = "movie") {
  return tmdbFetch<TMDBMovieDetail>(`/${mediaType}/${id}`);
}

export async function getSeasonDetails(tvId: number, seasonNumber: number) {
  return tmdbFetch<TMDBSeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`);
}

export async function getSimilar(id: number, mediaType: "movie" | "tv" = "movie") {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/${mediaType}/${id}/similar`);
  return data.results;
}

export async function getRecommendations(mediaType: "movie" | "tv" = "movie") {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/${mediaType}/top_rated`);
  return data.results;
}

export function getDisplayInfo(m: TMDBMovie | TMDBMovieDetail) {
  const title = m.title || m.name || "Untitled";
  const date = (m as TMDBMovie).release_date || (m as TMDBMovie).first_air_date || "";
  const year = date ? new Date(date).getFullYear() : null;
  return { title, year };
}

export const GENRE_IDS = {
  action: 28,
  animation: 16,
  comedy: 35,
  crime: 80,
  drama: 18,
  horror: 27,
  mystery: 9648,
  sciFi: 878,
} as const;

// Category config for View All pages
export interface CategoryConfig {
  title: string;
  mediaType: "movie" | "tv";
  fetchFn: () => Promise<TMDBMovie[]>;
}

export const CATEGORY_MAP: Record<string, CategoryConfig> = {
  "trending-today": { title: "Trending Today", mediaType: "movie", fetchFn: () => getTrending("all", "day") },
  "picked-for-you": { title: "Picked For You", mediaType: "movie", fetchFn: () => getPopular("movie") },
  "popular-this-week": { title: "Popular This Week", mediaType: "movie", fetchFn: () => getTrending("all", "week") },
  "top-rated-movies": { title: "Top Rated Movies", mediaType: "movie", fetchFn: () => getTopRated("movie") },
  "action-movies": { title: "Action Movies", mediaType: "movie", fetchFn: () => getByGenre(GENRE_IDS.action, "movie") },
  "comedy-movies": { title: "Comedy Movies", mediaType: "movie", fetchFn: () => getByGenre(GENRE_IDS.comedy, "movie") },
  "scifi-movies": { title: "Sci-Fi Movies", mediaType: "movie", fetchFn: () => getByGenre(GENRE_IDS.sciFi, "movie") },
  "horror-movies": { title: "Horror Movies", mediaType: "movie", fetchFn: () => getByGenre(GENRE_IDS.horror, "movie") },
  "popular-series": { title: "Popular Series", mediaType: "tv", fetchFn: () => getPopular("tv") },
  "crime-series": { title: "Crime Series", mediaType: "tv", fetchFn: () => getByGenre(GENRE_IDS.crime, "tv") },
  "mystery-series": { title: "Mystery Series", mediaType: "tv", fetchFn: () => getByGenre(GENRE_IDS.mystery, "tv") },
  "popular-anime": { title: "Popular Anime", mediaType: "tv", fetchFn: () => getByGenreAndLanguage(GENRE_IDS.animation, "ja", "tv") },
  "trending-anime": { title: "Trending Anime", mediaType: "tv", fetchFn: () => getByGenreAndLanguage(GENRE_IDS.animation, "ja", "tv") },
  "korean-dramas": { title: "Korean Dramas", mediaType: "tv", fetchFn: () => getByLanguage("ko", "tv") },
  "japanese-series": { title: "Japanese Series", mediaType: "tv", fetchFn: () => getByLanguage("ja", "tv") },
  "hidden-gems": { title: "Hidden Gems", mediaType: "movie", fetchFn: () => getHiddenGems("movie") },
};
