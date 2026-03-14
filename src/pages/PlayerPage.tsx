import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { CHANNELS } from "@/lib/player";
import { getMovieDetails, getSeasonDetails, getDisplayInfo } from "@/lib/tmdb";
import { useLibrary } from "@/lib/library";
import { Button } from "@/components/ui/button";

const PlayerPage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeChannel, setActiveChannel] = useState(0);
  const [subDub, setSubDub] = useState<"sub" | "dub">("sub");
  const { updateProgress } = useLibrary();

  const mediaType = (type as "movie" | "tv") || "movie";
  const tmdbId = Number(id);
  const season = Number(searchParams.get("season")) || 1;
  const episode = Number(searchParams.get("episode")) || 1;

  const { data: details } = useQuery({
    queryKey: ["player-detail", mediaType, tmdbId],
    queryFn: () => getMovieDetails(tmdbId, mediaType),
  });

  const { data: seasonData } = useQuery({
    queryKey: ["player-season", tmdbId, season],
    queryFn: () => getSeasonDetails(tmdbId, season),
    enabled: mediaType === "tv",
  });

  const totalEpisodes = seasonData?.episodes?.length || 0;
  const canPrev = mediaType === "tv" && episode > 1;
  const canNext = mediaType === "tv" && episode < totalEpisodes;

  // Save progress on mount
  useEffect(() => {
    if (details) {
      const movie = {
        id: details.id,
        title: details.title,
        name: details.name,
        overview: details.overview,
        poster_path: details.poster_path,
        backdrop_path: details.backdrop_path,
        vote_average: details.vote_average,
        release_date: details.release_date,
        first_air_date: details.first_air_date,
        genre_ids: details.genres.map((g) => g.id),
        media_type: mediaType,
      };
      updateProgress(movie, mediaType, 10, season, episode);
    }
  }, [details, mediaType, season, episode]);

  const playerUrl = CHANNELS[activeChannel].getUrl(mediaType, tmdbId, season, episode);
  const title = details ? getDisplayInfo(details as any).title : "Loading...";

  const goEpisode = (ep: number) => {
    navigate(`/player/tv/${tmdbId}?season=${season}&episode=${ep}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-3 py-3 bg-card/80 backdrop-blur-sm">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          {mediaType === "tv" && (
            <p className="text-xs text-muted-foreground">S{season} · E{episode}</p>
          )}
        </div>
      </div>

      {/* Channel buttons */}
      <div className="flex gap-2 px-3 py-2 overflow-x-auto">
        {CHANNELS.map((ch, i) => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              i === activeChannel
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {ch.name}
          </button>
        ))}
        {/* Sub/Dub toggle */}
        <div className="flex rounded-full overflow-hidden border border-border ml-auto">
          <button
            onClick={() => setSubDub("sub")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              subDub === "sub" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            }`}
          >
            Sub
          </button>
          <button
            onClick={() => setSubDub("dub")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              subDub === "dub" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            }`}
          >
            Dub
          </button>
        </div>
      </div>

      {/* Player */}
      <div className="flex-1 bg-black">
        <iframe
          key={`${playerUrl}-${subDub}`}
          src={playerUrl}
          className="w-full h-full min-h-[50vh]"
          allowFullScreen
          allow="autoplay; encrypted-media"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      {/* Episode navigation */}
      {mediaType === "tv" && (
        <div className="flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrev}
            onClick={() => goEpisode(episode - 1)}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Episode {episode}{totalEpisodes ? ` of ${totalEpisodes}` : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={() => goEpisode(episode + 1)}
            className="gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PlayerPage;
