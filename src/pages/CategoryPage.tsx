import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CATEGORY_MAP, type TMDBMovie } from "@/lib/tmdb";
import MovieCard from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const config = slug ? CATEGORY_MAP[slug] : undefined;
  const [page, setPage] = useState(1);
  const [allMovies, setAllMovies] = useState<TMDBMovie[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { isLoading, isFetching } = useQuery({
    queryKey: ["category", slug, page],
    queryFn: async () => {
      const results = await config!.fetchFn(page);
      if (!results || results.length === 0) {
        setHasMore(false);
        return results;
      }
      setAllMovies((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newItems = results.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newItems];
      });
      return results;
    },
    enabled: !!config,
  });

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
                <MovieCard movie={movie} mediaType={config.mediaType} compact />
              </div>
            ))}
      </div>

      {/* Load More */}
      {!loadingFirstPage && hasMore && (
        <div className="flex justify-center px-4 py-6">
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={isFetching}
            className="gap-2"
          >
            {isFetching && <Loader2 className="w-4 h-4 animate-spin" />}
            {isFetching ? "Loading…" : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
