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
  vote_count?: number;
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

// Global quality filter — discard items without poster or with very low votes
export function filterQuality(items: TMDBMovie[]): TMDBMovie[] {
  return items.filter(i => i.poster_path && (i.vote_count ?? 0) >= 50);
}

export async function getTrending(mediaType: "movie" | "tv" | "all" = "all", timeWindow: "day" | "week" = "week") {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/trending/${mediaType}/${timeWindow}`);
  return filterQuality(data.results);
}

export async function getPopular(mediaType: "movie" | "tv" = "movie", page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/${mediaType}/popular`, { page: String(page) });
  return filterQuality(data.results);
}

export async function getTopRated(mediaType: "movie" | "tv" = "movie", page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/${mediaType}/top_rated`, { page: String(page) });
  return filterQuality(data.results);
}

export async function getByGenre(genreId: number, mediaType: "movie" | "tv" = "movie", page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, {
    with_genres: String(genreId),
    sort_by: "popularity.desc",
    page: String(page),
  });
  return filterQuality(data.results);
}

export async function getByLanguage(language: string, mediaType: "movie" | "tv" = "tv", page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/discover/${mediaType}`, {
    with_original_language: language,
    sort_by: "popularity.desc",
    page: String(page),
  });
  return filterQuality(data.results);
}

// --- Strict filtered discovery functions ---

export async function getTrendingMovies(page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/discover/movie", {
    sort_by: "popularity.desc",
    "vote_count.gte": "300",
    "vote_average.gte": "6",
    "primary_release_date.gte": "2018-01-01",
    page: String(page),
  });
  return filterQuality(data.results);
}

export async function getTrendingSeries(page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/discover/tv", {
    sort_by: "popularity.desc",
    "vote_count.gte": "200",
    "vote_average.gte": "6",
    "first_air_date.gte": "2018-01-01",
    page: String(page),
  });
  return filterQuality(data.results);
}

export async function getAnimation(page = 1) {
  const [movies, tv] = await Promise.all([
    tmdbFetch<{ results: TMDBMovie[] }>("/discover/movie", {
      with_genres: "16",
      sort_by: "popularity.desc",
      "vote_count.gte": "200",
      "vote_average.gte": "6",
      "primary_release_date.gte": "2015-01-01",
      page: String(page),
    }),
    tmdbFetch<{ results: TMDBMovie[] }>("/discover/tv", {
      with_genres: "16",
      sort_by: "popularity.desc",
      "vote_count.gte": "200",
      "vote_average.gte": "6",
      "first_air_date.gte": "2015-01-01",
      page: String(page),
    }),
  ]);
  const combined = [...movies.results.map(m => ({ ...m, media_type: "movie" })), ...tv.results.map(m => ({ ...m, media_type: "tv" }))];
  return filterQuality(combined).sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 20);
}

export async function getKidsTeens(page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/discover/tv", {
    with_genres: "10762",
    certification_country: "US",
    "certification.lte": "PG-13",
    "vote_count.gte": "50",
    sort_by: "popularity.desc",
    page: String(page),
  });
  return filterQuality(data.results);
}

export async function getGlobalHits(page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/discover/movie", {
    sort_by: "popularity.desc",
    "vote_count.gte": "200",
    page: String(page),
  });
  return filterQuality(data.results);
}

export async function getKoreanDrama(page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/discover/tv", {
    with_original_language: "ko",
    "vote_count.gte": "100",
    sort_by: "popularity.desc",
    page: String(page),
  });
  return filterQuality(data.results);
}

export async function getJapaneseShows(page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/discover/tv", {
    with_original_language: "ja",
    without_genres: "16",
    "vote_count.gte": "100",
    sort_by: "popularity.desc",
    page: String(page),
  });
  return filterQuality(data.results);
}

export async function getBlackStories(page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/discover/movie", {
    with_genres: "18",
    with_keywords: "4344|180547",
    "vote_count.gte": "100",
    sort_by: "popularity.desc",
    page: String(page),
  });
  return filterQuality(data.results);
}

export async function getAction(page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/discover/movie", {
    with_genres: "28,12",
    "vote_count.gte": "300",
    sort_by: "popularity.desc",
    page: String(page),
  });
  return filterQuality(data.results);
}

export async function getRomanceDrama(page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/discover/movie", {
    with_genres: "10749,18",
    "vote_count.gte": "200",
    sort_by: "popularity.desc",
    page: String(page),
  });
  return filterQuality(data.results);
}

export async function getComedy(page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/discover/movie", {
    with_genres: "35",
    "vote_count.gte": "200",
    sort_by: "popularity.desc",
    page: String(page),
  });
  return filterQuality(data.results);
}

export async function getHorror(page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/discover/movie", {
    with_genres: "27",
    "vote_count.gte": "200",
    "vote_average.gte": "5.5",
    sort_by: "popularity.desc",
    page: String(page),
  });
  return filterQuality(data.results);
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
  return filterQuality(data.results);
}

export async function getRecommendations(mediaType: "movie" | "tv" = "movie") {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>(`/${mediaType}/top_rated`);
  return filterQuality(data.results);
}

export function getDisplayInfo(m: TMDBMovie | TMDBMovieDetail) {
  const title = m.title || m.name || "Untitled";
  const date = (m as TMDBMovie).release_date || (m as TMDBMovie).first_air_date || "";
  const year = date ? new Date(date).getFullYear() : null;
  return { title, year };
}

export function isAnime(item: TMDBMovie | TMDBMovieDetail): boolean {
  const isJapanese = item.original_language === "ja";
  const genreIds = 'genre_ids' in item ? item.genre_ids : (item.genres?.map(g => g.id) || []);
  const isAnimation = genreIds.includes(16);
  return isJapanese && isAnimation;
}

export function sortByFreshness(items: TMDBMovie[]): TMDBMovie[] {
  return [...items].sort((a, b) => {
    const scoreA = getFreshnessScore(a);
    const scoreB = getFreshnessScore(b);
    return scoreB - scoreA;
  });
}

function getFreshnessScore(item: TMDBMovie): number {
  const date = item.release_date || item.first_air_date;
  if (!date) return 0;
  const itemDate = new Date(date).getTime();
  const now = Date.now();
  const diffDays = Math.max(1, (now - itemDate) / (1000 * 60 * 60 * 24));
  return (item.vote_average || 0) * 10 + 1000 / diffDays;
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
  return filterQuality(data.results);
}

export async function getUpcoming(page = 1) {
  const data = await tmdbFetch<{ results: TMDBMovie[] }>("/movie/upcoming", { page: String(page) });
  return data.results;
}

// Category config for View All pages
export interface CategoryConfig {
  title: string;
  mediaType: "movie" | "tv" | "anime";
  fetchFn: (page?: number) => Promise<TMDBMovie[]>;
}

export const CATEGORY_MAP: Record<string, CategoryConfig> = {
  "trending-today": { title: "Trending Now", mediaType: "movie", fetchFn: () => getTrending("all", "day") },
  "trending-movies": { title: "Trending Movies", mediaType: "movie", fetchFn: (p) => getTrendingMovies(p) },
  "trending-series": { title: "Trending Series", mediaType: "tv", fetchFn: (p) => getTrendingSeries(p) },
  "animation": { title: "Animation", mediaType: "movie", fetchFn: (p) => getAnimation(p) },
  "kids-teens": { title: "Kids & Teens", mediaType: "tv", fetchFn: (p) => getKidsTeens(p) },
  "global-hits": { title: "Global Hits", mediaType: "movie", fetchFn: (p) => getGlobalHits(p) },
  "korean-dramas": { title: "Korean Drama", mediaType: "tv", fetchFn: (p) => getKoreanDrama(p) },
  "japanese-shows": { title: "Japanese Shows", mediaType: "tv", fetchFn: (p) => getJapaneseShows(p) },
  "black-stories": { title: "Black Stories", mediaType: "movie", fetchFn: (p) => getBlackStories(p) },
  "action": { title: "Action & Adventure", mediaType: "movie", fetchFn: (p) => getAction(p) },
  "romance-drama": { title: "Romance & Drama", mediaType: "movie", fetchFn: (p) => getRomanceDrama(p) },
  "comedy": { title: "Comedy & Feel-Good", mediaType: "movie", fetchFn: (p) => getComedy(p) },
  "horror": { title: "Horror", mediaType: "movie", fetchFn: (p) => getHorror(p) },
};
