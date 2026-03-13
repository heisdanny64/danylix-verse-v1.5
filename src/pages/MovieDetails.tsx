import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Plus } from "lucide-react";
import { getMovieById } from "@/data/movies";
import { Button } from "@/components/ui/button";

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const movie = getMovieById(Number(id));

  if (!movie) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Movie not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Backdrop */}
      <div className="relative h-[50vh] overflow-hidden">
        <img
          src={movie.backdrop}
          alt={movie.title}
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

      {/* Content */}
      <div className="px-4 -mt-20 relative z-10 space-y-4">
        <h1 className="text-3xl font-extrabold text-foreground leading-tight">
          {movie.title}
        </h1>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{movie.year}</span>
          <div className="flex items-center gap-1 text-primary">
            <Star className="w-4 h-4 fill-primary" />
            <span className="font-semibold">{movie.rating}</span>
          </div>
        </div>

        {/* Genres */}
        <div className="flex flex-wrap gap-2">
          {movie.genres.map((genre) => (
            <span
              key={genre}
              className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Synopsis */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {movie.synopsis}
        </p>

        {/* Actions */}
        <Button className="w-full gap-2 mt-2">
          <Plus className="w-4 h-4" />
          Add to Library
        </Button>
      </div>
    </div>
  );
};

export default MovieDetails;
