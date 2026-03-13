import { useQuery } from "@tanstack/react-query";
import { getRecommendations } from "@/lib/tmdb";
import MovieCard from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";

const RecommendationsPage = () => {
  const { data: movies, isLoading } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => getRecommendations("movie"),
  });

  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground">Recommended for You</h1>
        <p className="text-xs text-muted-foreground mt-1">Top rated picks from TMDB</p>
      </header>

      <div className="px-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))
          : movies?.map((movie) => (
              <MovieCard key={movie.id} movie={movie} mediaType="movie" />
            ))}
      </div>
    </div>
  );
};

export default RecommendationsPage;
