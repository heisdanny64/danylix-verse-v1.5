import type { TMDBMovie, TMDBMovieDetail } from "@/lib/tmdb";
import { posterUrl, backdropUrl, getDisplayInfo } from "@/lib/tmdb";
import type { GiftedSearchItem } from "@/services/giftedApi";

export type MediaItem = {
  id: string;
  title: string;
  poster: string;
  backdrop?: string;
  type: "movie" | "tv";
  source: "tmdb" | "gifted";
  year?: number;
  rating?: number;
  genres?: string[];
  isAnime?: boolean;
  isNollywood?: boolean;
  giftedId?: string;
};

/** Loose canonical title normalization for dedup / matching. */
export function normalizeTitle(title: string): string {
  return (title || "")
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stricter token signature including "english"/"dub"/"sub" so variants don't collide. */
export function variantKey(title: string): string {
  const n = normalizeTitle(title);
  // keep variant tokens
  const m = (title || "").toLowerCase().match(/\b(english|dub|dubbed|sub|subbed|raw|japanese)\b/);
  return m ? `${n}::${m[1]}` : n;
}

export function tmdbToMediaItem(
  m: TMDBMovie | TMDBMovieDetail,
  forcedType?: "movie" | "tv",
): MediaItem {
  const { title, year } = getDisplayInfo(m as any);
  const type =
    (forcedType ||
      ((m as any).media_type === "tv" ? "tv" : (m as any).media_type === "movie" ? "movie" : (m as any).first_air_date ? "tv" : "movie")) as "movie" | "tv";
  return {
    id: String(m.id),
    title,
    poster: posterUrl((m as any).poster_path),
    backdrop: backdropUrl((m as any).backdrop_path),
    type,
    source: "tmdb",
    year: year ?? undefined,
    rating: (m as any).vote_average,
    // Stash raw TMDB paths so consumers (MovieCard) can rebuild URLs at any size
    ...( { _posterPath: (m as any).poster_path, _backdropPath: (m as any).backdrop_path } as any ),
  };
}

export function giftedToMediaItem(g: GiftedSearchItem): MediaItem {
  const t = (g.type === "tv" ? "tv" : "movie") as "movie" | "tv";
  const yr = typeof g.year === "string" ? Number(g.year) : g.year;
  const item: MediaItem = {
    id: String(g.subjectId),
    title: g.title || "",
    poster: g.imageUrl || "/placeholder.svg",
    backdrop: g.imageUrl,
    type: t,
    source: "gifted",
    year: typeof yr === "number" && !Number.isNaN(yr) ? yr : undefined,
    rating: g.rating,
    giftedId: String(g.subjectId),
  };
  const lower = item.title.toLowerCase();
  if (lower.includes("nollywood")) item.isNollywood = true;
  return item;
}

/** TMDB MediaItem shaped as a TMDBMovie so existing MovieCard/MovieRow can render it. */
export function mediaToTmdbCard(m: MediaItem): TMDBMovie & { _giftedId?: string } {
  // For TMDB items keep the raw poster_path so posterUrl() can build a CDN URL.
  // For Gifted items the poster is already an absolute URL — pass it through.
  const rawPoster = (m as any)._posterPath as string | null | undefined;
  const rawBackdrop = (m as any)._backdropPath as string | null | undefined;
  return {
    id: Number(m.id) || 0,
    title: m.type === "movie" ? m.title : undefined,
    name: m.type === "tv" ? m.title : undefined,
    overview: "",
    poster_path: m.source === "gifted" ? (m.poster || null) : (rawPoster ?? null),
    backdrop_path: m.source === "gifted" ? (m.backdrop || null) : (rawBackdrop ?? null),
    vote_average: m.rating ?? 0,
    genre_ids: [],
    media_type: m.type,
    release_date: m.type === "movie" && m.year ? `${m.year}-01-01` : undefined,
    first_air_date: m.type === "tv" && m.year ? `${m.year}-01-01` : undefined,
    _giftedId: m.giftedId,
  } as any;
}