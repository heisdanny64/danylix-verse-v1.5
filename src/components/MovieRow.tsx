import type { TMDBMovie } from "@/lib/tmdb";
import MovieCard from "./MovieCard";
import { Skeleton } from "@/components/ui/skeleton";

interface MovieRowProps {
  title: string;
  movies: TMDBMovie[];
  isLoading?: boolean;
  mediaType?: "movie" | "tv";
}

const MovieRow = ({ title, movies, isLoading, mediaType }: MovieRowProps) => {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-foreground px-4">{title}</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[140px] md:w-[180px]">
                <Skeleton className="aspect-[2/3] rounded-lg" />
              </div>
            ))
          : movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} mediaType={mediaType} />
            ))}
      </div>
    </section>
  );
};

export default MovieRow;
