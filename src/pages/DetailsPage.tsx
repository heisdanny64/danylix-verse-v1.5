import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, Plus, Play, Check, Download } from "lucide-react";
import { getMovieDetails, backdropUrl, getDisplayInfo, type TMDBEpisode } from "@/lib/tmdb";
import { getMovieTVRecommendations } from "@/lib/tastedive";
import { useLibrary } from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import EpisodeList from "@/components/EpisodeList";
import MovieRow from "@/components/MovieRow";
import CastRow from "@/components/CastRow";
import DownloadModal from "@/components/DownloadModal";
import { useState } from "react";

const DetailsPage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { toggleWatchlist, isInWatchlist } = useLibrary();
  const [downloadOpen, setDownloadOpen] = useState(false);

  // Anime now flows through TV route
  const contentType = ((type === "anime" ? "tv" : type) as "movie" | "tv") || "movie";
  const numericId = Number(id);

  const { data: detail, isLoading } = useQuery({
    queryKey: ["detail", contentType, numericId],
    queryFn: () => getMovieDetails(numericId, contentType),
    enabled: !!numericId,
  });

  const tmdbTitle = detail ? getDisplayInfo(detail as any).title : "";
  const { data: recs } = useQuery({
    queryKey: ["tastedive-recs", contentType, tmdbTitle, numericId],
    queryFn: () => getMovieTVRecommendations(tmdbTitle, contentType, numericId),
    enabled: !!tmdbTitle,
    staleTime: 30 * 60 * 1000,
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

  if (!detail) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Content not found</p>
      </div>
    );
  }

  const { title, year } = getDisplayInfo(detail as any);
  const inWatchlist = isInWatchlist(detail.id, contentType);
  const seasons = contentType === "tv" ? detail.seasons?.filter((s) => s.season_number > 0) || [] : [];

  const handlePlayEpisode = (ep: TMDBEpisode) => {
    navigate(`/player/tv/${numericId}?season=${ep.season_number}&episode=${ep.episode_number}`);
  };

  const handleToggleWatchlist = () => {
    const m = {
      id: detail.id,
      title: detail.title,
      name: detail.name,
      overview: detail.overview,
      poster_path: detail.poster_path,
      backdrop_path: detail.backdrop_path,
      vote_average: detail.vote_average,
      release_date: detail.release_date,
      first_air_date: detail.first_air_date,
      genre_ids: detail.genres.map((g) => g.id),
    } as any;
    const added = toggleWatchlist(m, contentType);
    toast({ title: added ? "Added to Library" : "Removed from Library" });
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="relative h-[50vh] overflow-hidden">
        <img src={backdropUrl(detail.backdrop_path)} alt={title} className="w-full h-full object-cover" />
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
            <span className="font-semibold">{detail.vote_average.toFixed(1)}</span>
          </div>
          {contentType === "movie" && detail.runtime && <span className="text-muted-foreground">{detail.runtime} min</span>}
          {contentType === "tv" && detail.number_of_seasons && (
            <span className="text-muted-foreground">{detail.number_of_seasons} Season{detail.number_of_seasons > 1 ? "s" : ""}</span>
          )}
        </div>

        {detail.tagline && <p className="text-sm italic text-muted-foreground">{detail.tagline}</p>}

        <div className="flex flex-wrap gap-2">
          {detail.genres.map((genre) => (
            <span key={genre.id} className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {genre.name}
            </span>
          ))}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{detail.overview}</p>

        <div className="flex gap-2">
          <Button
            className="flex-1 gap-1.5"
            onClick={() => {
              if (contentType === "movie") navigate(`/player/movie/${numericId}`);
              else navigate(`/player/tv/${numericId}?season=1&episode=1`);
            }}
          >
            <Play className="w-4 h-4 fill-current" />
            Watch Now
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={handleToggleWatchlist}>
            {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden md:inline">{inWatchlist ? "Added" : "Add to Library"}</span>
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setDownloadOpen(true)}>
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {contentType === "tv" && seasons.length > 0 && (
          <div className="pt-2">
            <h2 className="text-lg font-bold text-foreground mb-2">Seasons & Episodes</h2>
            <Accordion type="single" collapsible>
              {seasons.map((s) => (
                <AccordionItem key={s.season_number} value={`season-${s.season_number}`}>
                  <AccordionTrigger className="text-sm">
                    {s.name} ({s.episode_count} episodes)
                  </AccordionTrigger>
                  <AccordionContent>
                    <EpisodeList tvId={numericId} seasonNumber={s.season_number} onPlayEpisode={handlePlayEpisode} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>

      <div className="mt-8">
        <CastRow id={detail.id} mediaType={contentType} />
      </div>

      {recs && recs.length > 0 && (
        <div className="mt-8">
          <MovieRow title="More Like This" movies={recs} mediaType={contentType} />
        </div>
      )}

      <DownloadModal
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        type={contentType}
        externalId={detail.id}
        title={title}
        year={year ? Number(year) : null}
      />
    </div>
  );
};

export default DetailsPage;
