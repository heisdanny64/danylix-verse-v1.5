import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, Plus } from "lucide-react";
import { getMovieDetails, backdropUrl, getDisplayInfo } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // id format: "movie-123" or "tv-456"
  const [mediaType, tmdbId] = (id || "movie-0").split("-") as ["movie" | "tv", string];

  const { data: movie, isLoading } = useQuery({
    queryKey: ["movie-detail", mediaType, tmdbId],
    queryFn: () => getMovieDetails(Number(tmdbId), mediaType),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pb-8">
        <Skeleton className="h-[50vh] w-full" />
        <div className="px-4 mt-4 space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Movie not found</p>
      </div>
    );
  }

  const { title, year } = getDisplayInfo(movie as any);

  return (
    <div className="min-h-screen pb-8">
      <div className="relative h-[50vh] overflow-hidden">
        <img
          src={backdropUrl(movie.backdrop_path)}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground hover:bg-background/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 -mt-20 relative z-10 space-y-4">
        <h1 className="text-3xl font-extrabold text-foreground leading-tight">{title}</h1>

        <div className="flex items-center gap-3 text-sm">
          {year && <span className="text-muted-foreground">{year}</span>}
          <div className="flex items-center gap-1 text-primary">
            <Star className="w-4 h-4 fill-primary" />
            <span className="font-semibold">{movie.vote_average.toFixed(1)}</span>
          </div>
          {movie.runtime && <span className="text-muted-foreground">{movie.runtime} min</span>}
        </div>

        {movie.tagline && (
          <p className="text-sm italic text-muted-foreground">{movie.tagline}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {movie.genres.map((genre) => (
            <span
              key={genre.id}
              className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground"
            >
              {genre.name}
            </span>
          ))}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{movie.overview}</p>

        <Button className="w-full gap-2 mt-2">
          <Plus className="w-4 h-4" />
          Add to Library
        </Button>
      </div>
    </div>
  );
};

export default MovieDetails;
