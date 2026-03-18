import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, Plus, Play, Check, Download, BookmarkPlus } from "lucide-react";
import { getMovieDetails, getSimilar, backdropUrl, getDisplayInfo, type TMDBEpisode } from "@/lib/tmdb";
import { getAnimeById, getAnimeRecommendations, jikanToTMDBMovie } from "@/lib/jikan";
import { useLibrary } from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import EpisodeList from "@/components/EpisodeList";
import MovieRow from "@/components/MovieRow";

const DetailsPage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToWatchlist, isInWatchlist } = useLibrary();

  const mediaType = (type as "movie" | "tv" | "anime") || "movie";
  const contentId = Number(id);

  // TMDB fetch for movie/tv
  const { data: tmdbDetail, isLoading: tmdbLoading } = useQuery({
    queryKey: ["detail", mediaType, contentId],
    queryFn: () => getMovieDetails(contentId, mediaType as "movie" | "tv"),
    enabled: !!contentId && mediaType !== "anime",
  });

  // Jikan fetch for anime
  const { data: animeDetail, isLoading: animeLoading } = useQuery({
    queryKey: ["anime-detail", contentId],
    queryFn: () => getAnimeById(contentId),
    enabled: !!contentId && mediaType === "anime",
  });

  // Similar / recommendations
  const { data: similar } = useQuery({
    queryKey: ["similar", mediaType, contentId],
    queryFn: () => mediaType === "anime"
      ? getAnimeRecommendations(contentId)
      : getSimilar(contentId, mediaType as "movie" | "tv"),
    enabled: !!contentId,
  });

  const isLoading = mediaType === "anime" ? animeLoading : tmdbLoading;

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

  // Normalize display data
  let title = "";
  let year: number | null = null;
  let rating = 0;
  let overview = "";
  let backdropSrc = "/placeholder.svg";
  let genres: { id: number; name: string }[] = [];
  let runtime: number | null = null;
  let tagline: string | null = null;
  let episodeCount: number | null = null;
  let status: string | null = null;
  let seasons: { season_number: number; name: string; episode_count: number }[] = [];
  let isUpcoming = false;
  let watchlistMovie: any = null;

  if (mediaType === "anime" && animeDetail) {
    title = animeDetail.title_english || animeDetail.title;
    year = animeDetail.aired?.from ? new Date(animeDetail.aired.from).getFullYear() : null;
    rating = animeDetail.score || 0;
    overview = animeDetail.synopsis || "";
    backdropSrc = animeDetail.images?.jpg?.large_image_url || "/placeholder.svg";
    genres = animeDetail.genres?.map((g) => ({ id: g.mal_id, name: g.name })) || [];
    episodeCount = animeDetail.episodes;
    status = animeDetail.status;
    isUpcoming = animeDetail.status === "Not yet aired";
    watchlistMovie = jikanToTMDBMovie(animeDetail);
  } else if (tmdbDetail) {
    const info = getDisplayInfo(tmdbDetail as any);
    title = info.title;
    year = info.year;
    rating = tmdbDetail.vote_average;
    overview = tmdbDetail.overview;
    backdropSrc = backdropUrl(tmdbDetail.backdrop_path);
    genres = tmdbDetail.genres;
    runtime = tmdbDetail.runtime || null;
    tagline = tmdbDetail.tagline || null;
    seasons = (tmdbDetail.seasons?.filter((s) => s.season_number > 0) || []);
    watchlistMovie = {
      id: tmdbDetail.id,
      title: tmdbDetail.title,
      name: tmdbDetail.name,
      overview: tmdbDetail.overview,
      poster_path: tmdbDetail.poster_path,
      backdrop_path: tmdbDetail.backdrop_path,
      vote_average: tmdbDetail.vote_average,
      release_date: tmdbDetail.release_date,
      first_air_date: tmdbDetail.first_air_date,
      genre_ids: tmdbDetail.genres.map((g) => g.id),
      media_type: mediaType,
    };
  }

  if (!watchlistMovie) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Content not found</p>
      </div>
    );
  }

  const inWatchlist = isInWatchlist(watchlistMovie.id);

  const handleWatch = () => {
    if (mediaType === "anime") {
      navigate(`/player/anime/${contentId}?episode=1&subDub=sub`);
    } else if (mediaType === "tv") {
      navigate(`/player/tv/${contentId}?season=1&episode=1`);
    } else {
      navigate(`/player/movie/${contentId}`);
    }
  };

  const handlePlayEpisode = (ep: TMDBEpisode) => {
    navigate(`/player/tv/${contentId}?season=${ep.season_number}&episode=${ep.episode_number}`);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Backdrop */}
      <div className="relative h-[50vh] overflow-hidden">
        <img src={backdropSrc} alt={title} className="w-full h-full object-cover" />
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

        <div className="flex items-center gap-3 text-sm flex-wrap">
          {year && <span className="text-muted-foreground">{year}</span>}
          {rating > 0 && (
            <div className="flex items-center gap-1 text-primary">
              <Star className="w-4 h-4 fill-primary" />
              <span className="font-semibold">{rating.toFixed(1)}</span>
            </div>
          )}
          {runtime && <span className="text-muted-foreground">{runtime} min</span>}
          {episodeCount && <span className="text-muted-foreground">{episodeCount} episodes</span>}
          {status && <span className="text-muted-foreground">{status}</span>}
          {mediaType === "tv" && seasons.length > 0 && (
            <span className="text-muted-foreground">{seasons.length} Season{seasons.length > 1 ? "s" : ""}</span>
          )}
        </div>

        {tagline && <p className="text-sm italic text-muted-foreground">{tagline}</p>}

        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <span key={genre.id} className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {genre.name}
            </span>
          ))}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{overview}</p>

        {/* Action buttons */}
        <div className="flex gap-2">
          {isUpcoming ? (
            <Button
              className="flex-1 gap-1.5"
              variant={inWatchlist ? "secondary" : "default"}
              onClick={() => addToWatchlist(watchlistMovie, "anime")}
            >
              {inWatchlist ? <Check className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
              {inWatchlist ? "In Wishlist" : "Add to Wishlist"}
            </Button>
          ) : (
            <Button className="flex-1 gap-1.5" onClick={handleWatch}>
              <Play className="w-4 h-4 fill-current" />
              Watch Now
            </Button>
          )}
          {!isUpcoming && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => addToWatchlist(watchlistMovie, mediaType as "movie" | "tv" | "anime")}
            >
              {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => toast({ title: "Coming Soon", description: "Download feature is not yet available." })}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {/* TV Seasons & Episodes */}
        {mediaType === "tv" && seasons.length > 0 && (
          <div className="pt-2">
            <h2 className="text-lg font-bold text-foreground mb-2">Seasons & Episodes</h2>
            <Accordion type="single" collapsible>
              {seasons.map((s) => (
                <AccordionItem key={s.season_number} value={`season-${s.season_number}`}>
                  <AccordionTrigger className="text-sm">
                    {s.name} ({s.episode_count} episodes)
                  </AccordionTrigger>
                  <AccordionContent>
                    <EpisodeList tvId={contentId} seasonNumber={s.season_number} onPlayEpisode={handlePlayEpisode} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>

      {/* More Like This */}
      {similar && similar.length > 0 && (
        <div className="mt-8">
          <MovieRow title="More Like This" movies={similar} mediaType={mediaType} />
        </div>
      )}
    </div>
  );
};

export default DetailsPage;
