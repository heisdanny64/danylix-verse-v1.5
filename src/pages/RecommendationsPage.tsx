import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Swords, Drama, Smile, Skull, Rocket, Ghost, Heart,
  Sparkles, Tv, FileVideo, Users, Loader2,
} from "lucide-react";
import MovieCard from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { type TMDBMovie } from "@/lib/tmdb";
import { getTrendingAnime, getPopularAnime, animeToCard } from "@/lib/anilist";
import { cn } from "@/lib/utils";

const TMDB_API_KEY = "eb81f29c8c34e05a51e64378606495c0";
const TMDB_BASE = "https://api.themoviedb.org/3";

type ChipKey =
  | "action" | "drama" | "comedy" | "thriller" | "scifi"
  | "horror" | "romance" | "animation" | "anime" | "documentary" | "family";

const CHIPS: { key: ChipKey; label: string; icon: any; tmdbGenre?: number }[] = [
  { key: "action", label: "Action", icon: Swords, tmdbGenre: 28 },
  { key: "drama", label: "Drama", icon: Drama, tmdbGenre: 18 },
  { key: "comedy", label: "Comedy", icon: Smile, tmdbGenre: 35 },
  { key: "thriller", label: "Thriller", icon: Skull, tmdbGenre: 53 },
  { key: "scifi", label: "Sci-Fi", icon: Rocket, tmdbGenre: 878 },
  { key: "horror", label: "Horror", icon: Ghost, tmdbGenre: 27 },
  { key: "romance", label: "Romance", icon: Heart, tmdbGenre: 10749 },
  { key: "animation", label: "Animation", icon: Sparkles, tmdbGenre: 16 },
  { key: "anime", label: "Anime", icon: Tv },
  { key: "documentary", label: "Documentary", icon: FileVideo, tmdbGenre: 99 },
  { key: "family", label: "Family", icon: Users, tmdbGenre: 10751 },
];

const MAX_CHIPS = 3;
const MIN_YEAR = 1995;

function getYear(item: TMDBMovie): number | null {
  const d = (item as any).release_date || (item as any).first_air_date;
  if (d) return Number(String(d).slice(0, 4)) || null;
  return null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function tmdb<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

async function fetchDiscoverBatch(genres: ChipKey[], page: number): Promise<TMDBMovie[]> {
  const tmdbGenres = genres
    .map((g) => CHIPS.find((c) => c.key === g)?.tmdbGenre)
    .filter(Boolean)
    .join(",");
  const includeAnime = genres.includes("anime");
  const onlyAnime = includeAnime && genres.length === 1;

  const params: Record<string, string> = {
    sort_by: "popularity.desc",
    "vote_count.gte": "100",
    "primary_release_date.gte": `${MIN_YEAR}-01-01`,
    page: String(page),
  };
  if (tmdbGenres) params.with_genres = tmdbGenres;

  const tvParams: Record<string, string> = { ...params };
  delete tvParams["primary_release_date.gte"];
  tvParams["first_air_date.gte"] = `${MIN_YEAR}-01-01`;

  const calls: Promise<TMDBMovie[]>[] = [];
  if (!onlyAnime) {
    calls.push(
      tmdb<{ results: TMDBMovie[] }>("/discover/movie", params).then((d) =>
        d.results.map((r) => ({ ...r, media_type: "movie" })),
      ),
      tmdb<{ results: TMDBMovie[] }>("/discover/tv", tvParams).then((d) =>
        d.results.map((r) => ({ ...r, media_type: "tv" })),
      ),
    );
    if (page === 1) {
      calls.push(
        tmdb<{ results: TMDBMovie[] }>("/movie/top_rated", { page: "1" }).then((d) =>
          d.results.map((r) => ({ ...r, media_type: "movie" })),
        ),
        tmdb<{ results: TMDBMovie[] }>("/trending/all/week", {}).then((d) =>
          d.results.filter((r: any) => r.media_type === "movie" || r.media_type === "tv"),
        ),
      );
    }
  }
  if (includeAnime) {
    calls.push(
      page % 2 === 1
        ? getTrendingAnime(Math.ceil(page / 2)).then((a) => a.map(animeToCard))
        : getPopularAnime(Math.ceil(page / 2)).then((a) => a.map(animeToCard)),
    );
  }

  const settled = await Promise.allSettled(calls);
  const all: TMDBMovie[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") all.push(...s.value);
  }
  // Filter quality + year
  const filtered = all.filter((i) => {
    if (!i.poster_path) return false;
    const y = getYear(i);
    if (y && y < MIN_YEAR) return false;
    return true;
  });
  return shuffle(filtered);
}

const RecommendationsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialGenres = useMemo<ChipKey[]>(() => {
    const raw = searchParams.get("genres");
    if (!raw) return [];
    return raw
      .split(",")
      .map((s) => s.trim() as ChipKey)
      .filter((g) => CHIPS.some((c) => c.key === g))
      .slice(0, MAX_CHIPS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [selected, setSelected] = useState<ChipKey[]>(initialGenres);
  const [items, setItems] = useState<TMDBMovie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Sync chips → URL
  useEffect(() => {
    if (selected.length === 0) {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ genres: selected.join(",") }, { replace: true });
    }
  }, [selected, setSearchParams]);

  // Reset feed when chips change
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, [selected]);

  // Fetch on page/selection change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDiscoverBatch(selected, page)
      .then((batch) => {
        if (cancelled) return;
        if (batch.length === 0) {
          setHasMore(false);
          return;
        }
        setItems((prev) => {
          const seen = new Set(prev.map((i) => `${i.media_type || "movie"}-${i.id}`));
          const merged = [...prev];
          for (const it of batch) {
            const key = `${it.media_type || "movie"}-${it.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(it);
            }
          }
          return merged;
        });
      })
      .catch(() => { if (!cancelled) setHasMore(false); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selected, page]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    setPage((p) => p + 1);
  }, [loading, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "300px" },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [loadMore]);

  const toggleChip = (key: ChipKey) => {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_CHIPS) return prev;
      return [...prev, key];
    });
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-extrabold text-foreground">Discover</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Mix &amp; match up to {MAX_CHIPS} genres
        </p>
      </header>

      <div className="overflow-x-auto scrollbar-hide px-4 pb-3">
        <div className="flex gap-2 w-max">
          {CHIPS.map(({ key, label, icon: Icon }) => {
            const active = selected.includes(key);
            const disabled = !active && selected.length >= MAX_CHIPS;
            return (
              <button
                key={key}
                onClick={() => toggleChip(key)}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted",
                  disabled && "opacity-40 cursor-not-allowed",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
        {items.length === 0 && loading
          ? Array.from({ length: 18 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))
          : items.map((m) => (
              <MovieCard
                key={`${m.media_type || "movie"}-${m.id}`}
                movie={m}
                mediaType={m.media_type as any}
                compact
              />
            ))}
      </div>

      {!loading && items.length === 0 && (
        <p className="text-center text-sm text-muted-foreground mt-12">
          No results. Try fewer or different chips.
        </p>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center px-4 py-6">
          {loading && items.length > 0 && (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendationsPage;
