import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import { useState, useMemo } from "react";
import { getGiftedSubject } from "@/services/giftedApi";

const DetailsPage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { toggleWatchlist, isInWatchlist } = useLibrary();
  const [downloadOpen, setDownloadOpen] = useState(false);

  const source = searchParams.get("source") || "tmdb";
  const contentType = ((type === "anime" ? "tv" : type) as "movie" | "tv") || "movie";
  const numericId = Number(id);

  // TMDB Metadata
  const { data: tmdbDetail, isLoading: tmdbLoading } = useQuery({
    queryKey: ["detail", contentType, numericId],
    queryFn: () => getMovieDetails(numericId, contentType),
    enabled: source === "tmdb" && !!numericId,
  });

  // Gifted Metadata
  const { data: giftedDetail, isLoading: giftedLoading } = useQuery({
    queryKey: ["gifted-detail", id],
    queryFn: () => getGiftedSubject(id!),
    enabled: source === "gifted" && !!id,
  });

  const isLoading = tmdbLoading || giftedLoading;

  // Unified Metadata Structure
  const detail = useMemo(() => {
    if (source === "tmdb") return tmdbDetail;
    if (source === "gifted" && giftedDetail) {
      return {
        id: giftedDetail.subjectId,
        title: giftedDetail.title,
        name: giftedDetail.title,
        overview: giftedDetail.overview || "",
        poster_path: giftedDetail.imageUrl || null,
        backdrop_path: giftedDetail.imageUrl || null,
        vote_average: giftedDetail.rating || 0,
        release_date: giftedDetail.year ? `${giftedDetail.year}-01-01` : undefined,
        first_air_date: giftedDetail.year ? `${giftedDetail.year}-01-01` : undefined,
        genres: (giftedDetail.genres || []).map((g, i) => ({ id: i, name: g })),
        runtime: undefined,
        tagline: undefined,
        number_of_seasons: giftedDetail.type === "tv" ? 1 : undefined,
        seasons: [],
      } as Record<string, unknown>;
    }
    return null;
  }, [source, tmdbDetail, giftedDetail]);

  const tmdbTitle = detail ? ((detail as Record<string, unknown>).title || (detail as Record<string, unknown>).name || "") : "";

  const { data: recs } = useQuery({
    queryKey: ["tastedive-recs", contentType, tmdbTitle, numericId],
    queryFn: () => getMovieTVRecommendations(tmdbTitle, contentType, numericId),
    enabled: !!detail && !!tmdbTitle && source === "tmdb",
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

  const title = (detail as Record<string, unknown>).title || (detail as Record<string, unknown>).name || "Untitled";
  const year = (detail as Record<string, unknown>).release_date ? String((detail as Record<string, unknown>).release_date).split("-")[0] : (detail as Record<string, unknown>).first_air_date ? String((detail as Record<string, unknown>).first_air_date).split("-")[0] : null;
  const inWatchlist = isInWatchlist(Number((detail as Record<string, unknown>).id), contentType);
  const seasons = contentType === "tv" ? ((detail as Record<string, unknown>).seasons as Array<{season_number: number}>)?.filter((s) => s.season_number > 0) || [] : [];

  const handlePlayEpisode = (ep: TMDBEpisode) => {
    navigate(`/player/tv/${id}?season=${ep.season_number}&episode=${ep.episode_number}${source === 'gifted' ? '&source=gifted' : ''}`);
  };

  const handleToggleWatchlist = () => {
    const m = {
      id: (detail as Record<string, unknown>).id,
      title: (detail as Record<string, unknown>).title,
      name: (detail as Record<string, unknown>).name,
      overview: (detail as Record<string, unknown>).overview,
      poster_path: (detail as Record<string, unknown>).poster_path,
      backdrop_path: (detail as Record<string, unknown>).backdrop_path,
      vote_average: (detail as Record<string, unknown>).vote_average,
      release_date: (detail as Record<string, unknown>).release_date,
      first_air_date: (detail as Record<string, unknown>).first_air_date,
      genre_ids: ((detail as Record<string, unknown>).genres as Array<{id: number}>).map((g) => g.id),
    } as Record<string, unknown>;
    const added = toggleWatchlist(m as any, contentType);
    toast({ title: added ? "Added to Library" : "Removed from Library" });
  };

  const poster = source === "gifted" ? (detail as Record<string, unknown>).poster_path : backdropUrl((detail as Record<string, unknown>).backdrop_path as string);

  return (
    <div className="min-h-screen pb-24">
      <div className="relative h-[50vh] overflow-hidden">
        <img src={poster || "/placeholder.svg"} alt={title} className="w-full h-full object-cover" />
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
            <span className="font-semibold">{Number((detail as Record<string, unknown>).vote_average).toFixed(1)}</span>
          </div>
          {contentType === "movie" && (detail as Record<string, unknown>).runtime && <span className="text-muted-foreground">{(detail as Record<string, unknown>).runtime} min</span>}
          {contentType === "tv" && (detail as Record<string, unknown>).number_of_seasons && (
            <span className="text-muted-foreground">{(detail as Record<string, unknown>).number_of_seasons} Season{Number((detail as Record<string, unknown>).number_of_seasons) > 1 ? "s" : ""}</span>
          )}
        </div>

        {(detail as Record<string, unknown>).tagline && <p className="text-sm italic text-muted-foreground">{(detail as Record<string, unknown>).tagline}</p>}

        <div className="flex flex-wrap gap-2">
          {((detail as Record<string, unknown>).genres as Array<{id: number; name: string}>).map((genre) => (
            <span key={genre.id} className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {genre.name}
            </span>
          ))}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{(detail as Record<string, unknown>).overview}</p>

        <div className="flex gap-2">
          <Button
            className="flex-1 gap-1.5"
            onClick={() => {
              const sourceParam = source === 'gifted' ? '?source=gifted' : '';
              if (contentType === "movie") navigate(`/player/movie/${id}${sourceParam}`);
              else navigate(`/player/tv/${id}?season=1&episode=1${source === 'gifted' ? '&source=gifted' : ''}`);
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
              {seasons.map((s: any) => (
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

      {source === "tmdb" && (
        <>
          <div className="mt-8">
            <CastRow id={Number(id)} mediaType={contentType} />
          </div>

          {recs && recs.length > 0 && (
            <div className="mt-8">
              <MovieRow title="More Like This" movies={recs} mediaType={contentType} />
            </div>
          )}
        </>
      )}

      <DownloadModal
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        type={contentType}
        externalId={source === 'tmdb' ? Number(id) : id}
        title={title}
        year={year ? Number(year) : null}
        source={source as "tmdb" | "gifted"}
      />
    </div>
  );
};

export default DetailsPage;
