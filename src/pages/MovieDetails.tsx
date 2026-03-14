import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, Plus, Play, Check, Download } from "lucide-react";
import { getMovieDetails, getSimilar, backdropUrl, getDisplayInfo } from "@/lib/tmdb";
import { useLibrary } from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import MovieRow from "@/components/MovieRow";

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToWatchlist, isInWatchlist } = useLibrary();

  // id format: "movie-123"
  const [, tmdbIdStr] = (id || "movie-0").split("-");
  const tmdbId = Number(tmdbIdStr);

  const { data: movie, isLoading } = useQuery({
    queryKey: ["movie-detail", tmdbId],
    queryFn: () => getMovieDetails(tmdbId, "movie"),
  });

  const { data: similar } = useQuery({
    queryKey: ["similar-movie", tmdbId],
    queryFn: () => getSimilar(tmdbId, "movie"),
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
  const inWatchlist = isInWatchlist(movie.id);

  return (
    <div className="min-h-screen pb-24">
      <div className="relative h-[50vh] overflow-hidden">
        <img src={backdropUrl(movie.backdrop_path)} alt={title} className="w-full h-full object-cover" />
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

        {movie.tagline && <p className="text-sm italic text-muted-foreground">{movie.tagline}</p>}

        <div className="flex flex-wrap gap-2">
          {movie.genres.map((genre) => (
            <span key={genre.id} className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {genre.name}
            </span>
          ))}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{movie.overview}</p>

        <div className="flex gap-2">
          <Button className="flex-1 gap-1.5" onClick={() => navigate(`/player/movie/${tmdbId}`)}>
            <Play className="w-4 h-4 fill-current" />
            Watch Now
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              const m = { id: movie.id, title: movie.title, overview: movie.overview, poster_path: movie.poster_path, backdrop_path: movie.backdrop_path, vote_average: movie.vote_average, release_date: movie.release_date, genre_ids: movie.genres.map(g => g.id) } as any;
              addToWatchlist(m, "movie");
            }}
          >
            {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => toast({ title: "Coming Soon", description: "Download feature is not yet available." })}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* More Like This */}
      {similar && similar.length > 0 && (
        <div className="mt-8">
          <MovieRow title="More Like This" movies={similar} mediaType="movie" />
        </div>
      )}
    </div>
  );
};

export default MovieDetails;
