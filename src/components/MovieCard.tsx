import { Link } from "react-router-dom";
import { posterUrl, getDisplayInfo, type TMDBMovie } from "@/lib/tmdb";

interface MovieCardProps {
  movie: TMDBMovie;
  mediaType?: "movie" | "tv" | "anime";
  compact?: boolean;
}

const MovieCard = ({ movie, mediaType, compact }: MovieCardProps) => {
  const { title, year } = getDisplayInfo(movie);
  const type = mediaType || movie.media_type || "movie";
  const isAnimeCard = (movie as any)._isAnimeCard === true;

  const link =
    type === "anime"
      ? `/details/anime/${movie.id}`
      : type === "tv"
        ? `/details/tv/${movie.id}`
        : `/details/movie/${movie.id}`;

  // For anime cards, poster_path is a full URL
  const posterSrc = isAnimeCard
    ? movie.poster_path || "/placeholder.svg"
    : posterUrl(movie.poster_path);

  return (
    <Link
      to={link}
      className={`group flex-shrink-0 ${compact ? "w-full" : ""}`}
      style={compact ? undefined : { width: "clamp(130px, 22vw, 220px)" }}
    >
      <div className="relative overflow-hidden rounded-lg transition-all duration-300 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)] group-hover:ring-1 group-hover:ring-primary/50">
        <div className="aspect-[2/3] bg-muted">
          <img
            src={posterSrc}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-3 pt-8">
          <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
            {title}
          </h3>
          {year && <p className="text-xs text-muted-foreground mt-0.5">{year}</p>}
        </div>
      </div>
    </Link>
  );
};

export default MovieCard;
