import { Link } from "react-router-dom";
import type { Movie } from "@/data/movies";

interface MovieCardProps {
  movie: Movie;
}

const MovieCard = ({ movie }: MovieCardProps) => {
  return (
    <Link to={`/movie/${movie.id}`} className="group flex-shrink-0 w-[140px] md:w-[180px]">
      <div className="relative overflow-hidden rounded-lg transition-all duration-300 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)] group-hover:ring-1 group-hover:ring-primary/50">
        <div className="aspect-[2/3] bg-muted">
          <img
            src={movie.poster}
            alt={movie.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-3 pt-8">
          <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
            {movie.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{movie.year}</p>
        </div>
      </div>
    </Link>
  );
};

export default MovieCard;
