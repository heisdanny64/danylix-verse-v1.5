import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { TMDBMovie } from "@/lib/tmdb";
import MovieCard from "./MovieCard";
import { Skeleton } from "@/components/ui/skeleton";

interface MovieRowProps {
  title: string;
  movies: TMDBMovie[];
  isLoading?: boolean;
  mediaType?: "movie" | "tv";
  slug?: string;
}

const MovieRow = ({ title, movies, isLoading, mediaType, slug }: MovieRowProps) => {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {slug && (
          <Link to={`/category/${slug}`} className="flex items-center gap-0.5 text-xs text-primary font-medium">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0" style={{ width: "clamp(130px, 22vw, 220px)" }}>
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
