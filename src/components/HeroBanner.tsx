import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Plus, Star, Check } from "lucide-react";
import { backdropUrl, getDisplayInfo, type TMDBMovie } from "@/lib/tmdb";
import { useLibrary } from "@/lib/library";
import { Button } from "@/components/ui/button";

interface HeroBannerProps {
  movies: TMDBMovie[];
}

const HeroBanner = ({ movies }: HeroBannerProps) => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const { addToWatchlist, isInWatchlist } = useLibrary();

  const featured = movies.slice(0, 5);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % featured.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (!featured.length) return null;

  const movie = featured[current];
  const { title, year } = getDisplayInfo(movie);
  const type = movie.media_type || "movie";
  const inWatchlist = isInWatchlist(movie.id);

  const handleWatch = () => {
    navigate(`/details/${type}/${movie.id}`);
  };

  return (
    <div className="relative w-full h-[55vh] overflow-hidden">
      <img
        src={backdropUrl(movie.backdrop_path, "w1280")}
        alt={title}
        className="w-full h-full object-cover transition-opacity duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

      <div className="absolute bottom-8 left-4 right-4 space-y-3">
        <h2 className="text-2xl font-extrabold text-foreground leading-tight line-clamp-2">{title}</h2>
        <div className="flex items-center gap-3 text-sm">
          {year && <span className="text-muted-foreground">{year}</span>}
          <div className="flex items-center gap-1 text-primary">
            <Star className="w-3.5 h-3.5 fill-primary" />
            <span className="font-semibold">{movie.vote_average.toFixed(1)}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 max-w-[80%]">{movie.overview}</p>
        <div className="flex gap-2">
          <Button size="sm" className="gap-1.5" onClick={handleWatch}>
            <Play className="w-3.5 h-3.5 fill-current" />
            Watch Now
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => addToWatchlist(movie, type as "movie" | "tv" | "anime")}
          >
            {inWatchlist ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {inWatchlist ? "Added" : "Add to Library"}
          </Button>
        </div>

        {featured.length > 1 && (
          <div className="flex gap-1.5 pt-1">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === current ? "w-4 bg-primary" : "bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroBanner;
