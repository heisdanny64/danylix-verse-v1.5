import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CATEGORY_MAP, type TMDBMovie } from "@/lib/tmdb";
import { getTrendingAnime, getPopularAnime, animeToCard } from "@/lib/anilist";
import MovieCard from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";

// Anime category configs
const ANIME_CATEGORIES: Record<string, { title: string; mediaType: "anime"; fetchFn: (page?: number) => Promise<TMDBMovie[]> }> = {
  "trending-anime": {
    title: "Trending Anime",
    mediaType: "anime",
    fetchFn: async (page = 1) => (await getTrendingAnime(page)).map(animeToCard),
  },
  "popular-anime": {
    title: "Popular Anime",
    mediaType: "anime",
    fetchFn: async (page = 1) => (await getPopularAnime(page)).map(animeToCard),
  },
};

const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const tmdbConfig = slug ? CATEGORY_MAP[slug] : undefined;
  const animeConfig = slug ? ANIME_CATEGORIES[slug] : undefined;
  const config = tmdbConfig || animeConfig;
  const isMixed = tmdbConfig?.mixed || false;
  const mediaType = animeConfig?.mediaType || tmdbConfig?.mediaType || "movie";

  const [page, setPage] = useState(1);
  const [allMovies, setAllMovies] = useState<TMDBMovie[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const postProcess = tmdbConfig?.postProcess;

  const { isLoading, isFetching } = useQuery({
    queryKey: ["category", slug, page],
    queryFn: async () => {
      let results = await config!.fetchFn(page);
      if (!results || results.length === 0) {
        setHasMore(false);
        return results;
      }
      if (postProcess) results = postProcess(results);
      setAllMovies((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newItems = results.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newItems];
      });
      return results;
    },
    enabled: !!config,
  });

  // Infinite scroll via IntersectionObserver
  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setPage((p) => p + 1);
    }
  }, [isFetching, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Category not found</p>
      </div>
    );
  }

  const loadingFirstPage = isLoading && page === 1;

  return (
    <div className="min-h-screen pb-24">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-card flex items-center justify-center text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground">{config.title}</h1>
      </header>

      <div className="px-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
        {loadingFirstPage
          ? Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))
          : allMovies.map((movie) => (
              <div key={movie.id} className="w-full">
                <MovieCard movie={movie} mediaType={mediaType as any} compact />
              </div>
            ))}
      </div>

      {/* Infinite scroll sentinel */}
      {!loadingFirstPage && hasMore && (
        <div ref={sentinelRef} className="flex justify-center px-4 py-6">
          {isFetching && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
