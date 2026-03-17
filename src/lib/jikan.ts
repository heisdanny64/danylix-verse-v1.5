import type { TMDBMovie } from "@/lib/tmdb";

const BASE = "https://api.jikan.moe/v4";

export interface JikanImage {
  image_url: string;
  small_image_url: string;
  large_image_url: string;
}

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  images: { jpg: JikanImage; webp: JikanImage };
  synopsis: string | null;
  episodes: number | null;
  genres: { mal_id: number; name: string }[];
  score: number | null;
  status: string;
  aired: { from: string | null; to: string | null };
  type: string;
  rating: string | null;
  popularity: number;
}

interface JikanPaginated<T> {
  data: T[];
  pagination: { last_visible_page: number; has_next_page: boolean };
}

interface JikanSingle<T> {
  data: T;
}

// Simple rate-limit queue — Jikan allows ~3 req/s
let lastRequest = 0;
async function jikanFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const now = Date.now();
  const wait = Math.max(0, 334 - (now - lastRequest));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();

  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (res.status === 429) {
    // Rate limited — wait and retry once
    await new Promise((r) => setTimeout(r, 1000));
    lastRequest = Date.now();
    const retry = await fetch(url.toString());
    if (!retry.ok) throw new Error(`Jikan error: ${retry.status}`);
    return retry.json();
  }
  if (!res.ok) throw new Error(`Jikan error: ${res.status}`);
  return res.json();
}

// ─── Endpoints ───

export async function getTopAnime(page = 1): Promise<TMDBMovie[]> {
  const data = await jikanFetch<JikanPaginated<JikanAnime>>("/top/anime", {
    page: String(page),
    limit: "25",
    filter: "bypopularity",
  });
  return data.data.map(jikanToTMDBMovie);
}

export async function getCurrentSeasonAnime(page = 1): Promise<TMDBMovie[]> {
  const data = await jikanFetch<JikanPaginated<JikanAnime>>("/seasons/now", {
    page: String(page),
    limit: "25",
  });
  return data.data.map(jikanToTMDBMovie);
}

export async function getUpcomingAnime(page = 1): Promise<TMDBMovie[]> {
  const data = await jikanFetch<JikanPaginated<JikanAnime>>("/seasons/upcoming", {
    page: String(page),
    limit: "25",
  });
  return data.data.map(jikanToTMDBMovie);
}

export async function searchAnime(query: string): Promise<TMDBMovie[]> {
  const data = await jikanFetch<JikanPaginated<JikanAnime>>("/anime", {
    q: query,
    limit: "15",
    order_by: "popularity",
    sort: "asc",
  });
  return data.data.map(jikanToTMDBMovie);
}

export async function getAnimeRecommendations(malId: number): Promise<TMDBMovie[]> {
  const data = await jikanFetch<JikanPaginated<{ entry: JikanAnime }>>(`/anime/${malId}/recommendations`);
  return data.data.slice(0, 20).map((r) => jikanToTMDBMovie(r.entry));
}

export async function getAnimeById(malId: number): Promise<JikanAnime> {
  const data = await jikanFetch<JikanSingle<JikanAnime>>(`/anime/${malId}/full`);
  return data.data;
}

// ─── Adapter ───

export function jikanToTMDBMovie(anime: JikanAnime): TMDBMovie {
  return {
    id: anime.mal_id,
    mal_id: anime.mal_id,
    title: anime.title_english || anime.title,
    name: anime.title,
    overview: anime.synopsis || "",
    poster_path: anime.images?.jpg?.large_image_url || null,
    backdrop_path: anime.images?.jpg?.large_image_url || null,
    vote_average: anime.score || 0,
    release_date: anime.aired?.from?.split("T")[0] || "",
    first_air_date: anime.aired?.from?.split("T")[0] || "",
    genre_ids: anime.genres?.map((g) => g.mal_id) || [],
    media_type: "anime",
    original_language: "ja",
  };
}
