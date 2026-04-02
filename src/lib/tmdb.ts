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
  origin_country?: string[];
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
  original_language?: string;
  origin_country?: string[];
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

export async function getPopular(mediaType: "movie" | "tv" = "movie", page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/${mediaType}/popular`, { page: String(page) });
  return data.results;
}

export async function getTopRated(mediaType: "movie" | "tv" = "movie", page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/${mediaType}/top_rated`, { page: String(page) });
  return data.results;
}

export async function getByGenre(genreId: number, mediaType: "movie" | "tv" = "movie", page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, {
    with_genres: String(genreId),
    sort_by: "popularity.desc",
    page: String(page),
  });
  return data.results;
}

export async function getByGenreAndLanguage(genreId: number, language: string, mediaType: "movie" | "tv" = "tv", page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, {
    with_genres: String(genreId),
    with_original_language: language,
    sort_by: "popularity.desc",
    page: String(page),
  });
  return data.results;
}

export async function getByLanguage(language: string, mediaType: "movie" | "tv" = "tv", page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, {
    with_original_language: language,
    sort_by: "popularity.desc",
    page: String(page),
  });
  return data.results;
}

export async function getHiddenGems(mediaType: "movie" | "tv" = "movie", page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, {
    sort_by: "vote_average.desc",
    "vote_count.gte": "50",
    "vote_count.lte": "500",
    "vote_average.gte": "7.5",
    page: String(page),
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

// Anime detection — requires Japanese language + animation genre
export function isAnime(item: TMDBMovie | TMDBMovieDetail): boolean {
  const isJapanese = item.original_language === "ja";
  const genreIds = 'genre_ids' in item ? item.genre_ids : (item.genres?.map(g => g.id) || []);
  const isAnimation = genreIds.includes(16);
  return isJapanese && isAnimation;
}

// Freshness scoring for prioritizing recent content
function getFreshnessScore(item: TMDBMovie): number {
  const date = item.release_date || item.first_air_date;
  if (!date) return 0;
  const itemDate = new Date(date).getTime();
  const now = Date.now();
  const diffDays = Math.max(1, (now - itemDate) / (1000 * 60 * 60 * 24));
  return (item.vote_average || 0) * 10 + 1000 / diffDays;
}

export function sortByFreshness(items: TMDBMovie[]): TMDBMovie[] {
  return [...items].sort((a, b) => getFreshnessScore(b) - getFreshnessScore(a));
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
  romance: 10749,
  thriller: 53,
  fantasy: 14,
  documentary: 99,
  family: 10751,
} as const;

export async function getByOriginCountry(country: string, mediaType: "movie" | "tv" = "tv", page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, {
    with_origin_country: country,
    sort_by: "popularity.desc",
    page: String(page),
  });
  return data.results;
}

export async function getUpcoming(page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/movie/upcoming", { page: String(page) });
  return data.results;
}

// Category config for View All pages
export interface CategoryConfig {
  title: string;
  mediaType: "movie" | "tv";
  fetchFn: (page?: number) => Promise<TMDBMovie[]>;
}

export const CATEGORY_MAP: Record<string, CategoryConfig> = {
  "trending-today": { title: "Trending Today", mediaType: "movie", fetchFn: () => getTrending("all", "day") },
  "popular-movies": { title: "Popular Movies", mediaType: "movie", fetchFn: (p) => getPopular("movie", p) },
  "popular-series": { title: "Popular TV Shows", mediaType: "tv", fetchFn: (p) => getPopular("tv", p) },
  "top-rated-movies": { title: "Top Rated", mediaType: "movie", fetchFn: (p) => getTopRated("movie", p) },
  "comedy-movies": { title: "Comedy", mediaType: "movie", fetchFn: (p) => getByGenre(GENRE_IDS.comedy, "movie", p) },
  "romance": { title: "Romance", mediaType: "movie", fetchFn: (p) => getByGenre(GENRE_IDS.romance, "movie", p) },
  "thriller-mystery": { title: "Thriller & Mystery", mediaType: "movie", fetchFn: (p) => getByGenre(GENRE_IDS.thriller, "movie", p) },
  "animation": { title: "Animation", mediaType: "movie", fetchFn: (p) => getByGenre(GENRE_IDS.animation, "movie", p) },
  "kids-teens": { title: "Kids & Teens", mediaType: "movie", fetchFn: (p) => getByGenre(GENRE_IDS.family, "movie", p) },
  "documentaries": { title: "Documentaries", mediaType: "movie", fetchFn: (p) => getByGenre(GENRE_IDS.documentary, "movie", p) },
  "scifi-fantasy": { title: "Sci-Fi & Fantasy", mediaType: "movie", fetchFn: (p) => getByGenre(GENRE_IDS.sciFi, "movie", p) },
  "upcoming": { title: "Upcoming", mediaType: "movie", fetchFn: (p) => getUpcoming(p) },
  "hidden-gems": { title: "Hidden Gems", mediaType: "movie", fetchFn: (p) => getHiddenGems("movie", p) },
  "nollywood": { title: "Nollywood", mediaType: "tv", fetchFn: (p) => getByOriginCountry("NG", "tv", p) },
  "korean-dramas": { title: "K-Drama", mediaType: "tv", fetchFn: (p) => getByLanguage("ko", "tv", p) },
  "chinese-dramas": { title: "C-Drama", mediaType: "tv", fetchFn: (p) => getByLanguage("zh", "tv", p) },
  "thai-dramas": { title: "Thai Drama", mediaType: "tv", fetchFn: (p) => getByLanguage("th", "tv", p) },
  "south-african-drama": { title: "South African Drama", mediaType: "tv", fetchFn: (p) => getByOriginCountry("ZA", "tv", p) },
};
