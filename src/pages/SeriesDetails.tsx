import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, Plus, Play, Check, Download } from "lucide-react";
import { getMovieDetails, getSimilar, backdropUrl, getDisplayInfo, type TMDBEpisode } from "@/lib/tmdb";
import { useLibrary } from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import EpisodeList from "@/components/EpisodeList";
import MovieRow from "@/components/MovieRow";

const SeriesDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const tmdbId = Number(id);
  const { addToWatchlist, isInWatchlist } = useLibrary();

  const { data: series, isLoading } = useQuery({
    queryKey: ["tv-detail", tmdbId],
    queryFn: () => getMovieDetails(tmdbId, "tv"),
  });

  const { data: similar } = useQuery({
    queryKey: ["similar-tv", tmdbId],
    queryFn: () => getSimilar(tmdbId, "tv"),
  });

  const handlePlayEpisode = (ep: TMDBEpisode) => {
    navigate(`/player/tv/${tmdbId}?season=${ep.season_number}&episode=${ep.episode_number}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-8">
        <Skeleton className="h-[45vh] w-full" />
        <div className="px-4 mt-4 space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Series not found</p>
      </div>
    );
  }

  const { title, year } = getDisplayInfo(series as any);
  const inWatchlist = isInWatchlist(series.id);
  const seasons = series.seasons?.filter((s) => s.season_number > 0) || [];

  return (
    <div className="min-h-screen pb-24">
      {/* Backdrop */}
      <div className="relative h-[45vh] overflow-hidden">
        <img src={backdropUrl(series.backdrop_path)} alt={title} className="w-full h-full object-cover" />
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
            <span className="font-semibold">{series.vote_average.toFixed(1)}</span>
          </div>
          {series.number_of_seasons && (
            <span className="text-muted-foreground">{series.number_of_seasons} Season{series.number_of_seasons > 1 ? "s" : ""}</span>
          )}
        </div>

        {series.tagline && <p className="text-sm italic text-muted-foreground">{series.tagline}</p>}

        <div className="flex flex-wrap gap-2">
          {series.genres.map((genre) => (
            <span key={genre.id} className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {genre.name}
            </span>
          ))}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{series.overview}</p>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button className="flex-1 gap-1.5" onClick={() => navigate(`/player/tv/${tmdbId}?season=1&episode=1`)}>
            <Play className="w-4 h-4 fill-current" />
            Watch Now
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              const m = { id: series.id, name: series.name, overview: series.overview, poster_path: series.poster_path, backdrop_path: series.backdrop_path, vote_average: series.vote_average, first_air_date: series.first_air_date, genre_ids: series.genres.map(g => g.id) } as any;
              addToWatchlist(m, "tv");
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

        {/* Seasons & Episodes */}
        <div className="pt-2">
          <h2 className="text-lg font-bold text-foreground mb-2">Seasons & Episodes</h2>
          {seasons.length > 0 ? (
            <Accordion type="single" collapsible>
              {seasons.map((s) => (
                <AccordionItem key={s.season_number} value={`season-${s.season_number}`}>
                  <AccordionTrigger className="text-sm">
                    {s.name} ({s.episode_count} episodes)
                  </AccordionTrigger>
                  <AccordionContent>
                    <EpisodeList tvId={tmdbId} seasonNumber={s.season_number} onPlayEpisode={handlePlayEpisode} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-sm text-muted-foreground">No season data available.</p>
          )}
        </div>
      </div>

      {/* More Like This */}
      {similar && similar.length > 0 && (
        <div className="mt-8">
          <MovieRow title="More Like This" movies={similar} mediaType="tv" />
        </div>
      )}
    </div>
  );
};

export default SeriesDetails;
