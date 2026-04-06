import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, Plus, Play, Check, Download } from "lucide-react";
import { getMovieDetails, backdropUrl, getDisplayInfo, type TMDBEpisode } from "@/lib/tmdb";
import { getAnimeDetails, animeToCard, type AnimeItem } from "@/lib/anilist";
import { getMovieTVRecommendations, getAnimeRecommendationsFromTasteDive } from "@/lib/tastedive";
import { useLibrary } from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import EpisodeList from "@/components/EpisodeList";
import AnimeEpisodeList from "@/components/AnimeEpisodeList";
import MovieRow from "@/components/MovieRow";

const DetailsPage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { toggleWatchlist, isInWatchlist } = useLibrary();

  const contentType = (type as "movie" | "tv" | "anime") || "movie";
  const numericId = Number(id);

  // TMDB queries (movie/tv only)
  const { data: tmdbDetail, isLoading: tmdbLoading } = useQuery({
    queryKey: ["detail", contentType, numericId],
    queryFn: () => getMovieDetails(numericId, contentType as "movie" | "tv"),
    enabled: contentType !== "anime" && !!numericId,
  });

  // Movie/TV recommendations via TasteDive → TMDB (with failsafe)
  const tmdbTitle = tmdbDetail ? getDisplayInfo(tmdbDetail as any).title : "";
  const { data: movieTvRecs } = useQuery({
    queryKey: ["tastedive-recs", contentType, tmdbTitle, numericId],
    queryFn: () => getMovieTVRecommendations(tmdbTitle, contentType as "movie" | "tv", numericId),
    enabled: contentType !== "anime" && !!tmdbTitle,
  });

  // AniList query (anime only)
  const { data: animeDetail, isLoading: animeLoading } = useQuery({
    queryKey: ["anime-detail", numericId],
    queryFn: () => getAnimeDetails(numericId),
    enabled: contentType === "anime" && !!numericId,
  });

  const isLoading = contentType === "anime" ? animeLoading : tmdbLoading;

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

  if (contentType === "anime") {
    return <AnimeDetailsView anime={animeDetail!} navigate={navigate} toast={toast} toggleWatchlist={toggleWatchlist} isInWatchlist={isInWatchlist} />;
  }

  const detail = tmdbDetail;
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
    const added = toggleWatchlist(m, contentType as "movie" | "tv");
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
              if (contentType === "movie") {
                navigate(`/player/movie/${numericId}`);
              } else {
                navigate(`/player/tv/${numericId}?season=1&episode=1`);
              }
            }}
          >
            <Play className="w-4 h-4 fill-current" />
            Watch Now
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={handleToggleWatchlist}
          >
            {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden md:inline">{inWatchlist ? "Added" : "Add to Library"}</span>
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => toast({ title: "Coming Soon", description: "Download feature is not yet available." })}
          >
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

      {movieTvRecs && movieTvRecs.length > 0 && (
        <div className="mt-8">
          <MovieRow title="More Like This" movies={movieTvRecs} mediaType={contentType as "movie" | "tv"} />
        </div>
      )}
    </div>
  );
};

// Anime sub-view
interface AnimeDetailsViewProps {
  anime: AnimeItem;
  navigate: ReturnType<typeof useNavigate>;
  toast: ReturnType<typeof useToast>["toast"];
  toggleWatchlist: any;
  isInWatchlist: (id: number, mediaType?: string) => boolean;
}

const AnimeDetailsView = ({ anime, navigate, toast, toggleWatchlist, isInWatchlist }: AnimeDetailsViewProps) => {
  if (!anime) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Anime not found</p>
      </div>
    );
  }

  const inWatchlist = isInWatchlist(anime.id, "anime");

  const { data: animeRecs } = useQuery({
    queryKey: ["anime-recs-merged", anime.id, anime.title],
    queryFn: () => getAnimeRecommendationsFromTasteDive(anime.title, anime.id),
  });

  const handlePlayEpisode = (_season: number, episode: number) => {
    navigate(`/player/anime/${anime.id}?season=1&episode=${episode}`);
  };

  const handleToggleWatchlist = () => {
    const m = {
      id: anime.id,
      title: anime.title,
      overview: anime.description,
      poster_path: anime.poster,
      backdrop_path: anime.banner,
      vote_average: anime.rating,
      release_date: anime.year ? `${anime.year}-01-01` : "",
      genre_ids: [],
      media_type: "anime",
      _isAnimeCard: true,
    } as any;
    const added = toggleWatchlist(m, "anime");
    toast({ title: added ? "Added to Library" : "Removed from Library" });
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="relative h-[50vh] overflow-hidden">
        {anime.banner ? (
          <img src={anime.banner} alt={anime.title} className="w-full h-full object-cover" />
        ) : (
          <img src={anime.poster} alt={anime.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground hover:bg-background/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 -mt-20 relative z-10 space-y-4">
        <h1 className="text-3xl font-extrabold text-foreground leading-tight">{anime.title}</h1>

        <div className="flex items-center gap-3 text-sm">
          {anime.year && <span className="text-muted-foreground">{anime.year}</span>}
          <div className="flex items-center gap-1 text-primary">
            <Star className="w-4 h-4 fill-primary" />
            <span className="font-semibold">{anime.rating.toFixed(1)}</span>
          </div>
          {anime.episodes > 0 && <span className="text-muted-foreground">{anime.episodes} Episodes</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          {anime.genres.map((genre) => (
            <span key={genre} className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {genre}
            </span>
          ))}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{anime.description}</p>

        <div className="flex gap-2">
          <Button
            className="flex-1 gap-1.5"
            onClick={() => handlePlayEpisode(1, 1)}
            disabled={anime.status === "NOT_YET_RELEASED"}
          >
            <Play className="w-4 h-4 fill-current" />
            {anime.status === "NOT_YET_RELEASED" ? "Coming Soon" : "Watch Now"}
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={handleToggleWatchlist}
          >
            {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {inWatchlist ? "Added" : "Add to Library"}
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => toast({ title: "Coming Soon", description: "Download feature is not yet available." })}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        <div className="pt-2">
          <h2 className="text-lg font-bold text-foreground mb-2">Episodes</h2>
          <AnimeEpisodeList
            animeId={anime.id}
            seasonNumber={1}
            totalEpisodes={anime.episodes}
            onPlayEpisode={handlePlayEpisode}
          />
        </div>
      </div>

      {animeRecs && animeRecs.length > 0 && (
        <div className="mt-8">
          <MovieRow title="More Like This" movies={animeRecs} mediaType="anime" />
        </div>
      )}
    </div>
  );
};

export default DetailsPage;
