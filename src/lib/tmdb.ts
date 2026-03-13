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

export async function getByGenre(genreId: number, mediaType: "movie" | "tv" = "movie") {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, {
    with_genres: String(genreId),
    sort_by: "popularity.desc",
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

export async function getRecommendations(mediaType: "movie" | "tv" = "movie") {
  // Use top-rated as "recommendations"
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/${mediaType}/top_rated`);
  return data.results;
}

// Helper to get display title & year from a TMDB result
export function getDisplayInfo(m: TMDBMovie | TMDBMovieDetail) {
  const title = m.title || m.name || "Untitled";
  const date = (m as TMDBMovie).release_date || (m as TMDBMovie).first_air_date || "";
  const year = date ? new Date(date).getFullYear() : null;
  return { title, year };
}

// Genre IDs for common categories
export const GENRE_IDS = {
  action: 28,
  animation: 16, // closest to "anime"
  comedy: 35,
  drama: 18,
  horror: 27,
  sciFi: 878,
} as const;
