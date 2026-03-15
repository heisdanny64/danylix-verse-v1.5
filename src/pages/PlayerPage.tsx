import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { CHANNELS } from "@/lib/player";
import { getMovieDetails, getSeasonDetails, getDisplayInfo, isAnime } from "@/lib/tmdb";
import { useLibrary } from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

const PlayerPage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeChannel, setActiveChannel] = useState(0);
  const [subDub, setSubDub] = useState<"sub" | "dub">("sub");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const { updateProgress } = useLibrary();

  const mediaType = (type as "movie" | "tv") || "movie";
  const tmdbId = Number(id);
  const season = Number(searchParams.get("season")) || 1;
  const episode = Number(searchParams.get("episode")) || 1;

  const { data: details, isLoading: detailsLoading } = useQuery({
    queryKey: ["player-detail", mediaType, tmdbId],
    queryFn: () => getMovieDetails(tmdbId, mediaType),
    enabled: !!tmdbId,
  });

  const { data: seasonData } = useQuery({
    queryKey: ["player-season", tmdbId, season],
    queryFn: () => getSeasonDetails(tmdbId, season),
    enabled: mediaType === "tv" && !!tmdbId,
  });

  const totalEpisodes = seasonData?.episodes?.length || 0;
  const canPrev = mediaType === "tv" && episode > 1;
  const canNext = mediaType === "tv" && episode < totalEpisodes;
  const animeTitle = details ? isAnime(details as any) : false;

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
        original_language: details.original_language,
      };
      updateProgress(movie, mediaType, 10, season, episode);
    }
  }, [details, mediaType, season, episode]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const channel = CHANNELS[activeChannel];
  const playerUrl = (!channel.disabled && tmdbId) ? channel.getUrl(mediaType, tmdbId, season, episode) : "";
  const displayInfo = details ? getDisplayInfo(details as any) : null;

  const goEpisode = (ep: number) => {
    navigate(`/player/tv/${tmdbId}?season=${season}&episode=${ep}`, { replace: true });
  };

  const handleChannelSwitch = (index: number) => {
    const ch = CHANNELS[index];
    if (ch.disabled) {
      toast({ title: "Channel 3 is coming soon", description: "This channel will be available in a future update." });
      return;
    }
    setActiveChannel(index);
  };

  const toggleFullscreen = () => {
    const el = videoWrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Loading state
  if (detailsLoading || !details) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-[1100px] space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  // Error state — no valid URL
  if (!playerUrl && !CHANNELS[activeChannel].disabled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Playback unavailable</h3>
          <p className="text-sm text-muted-foreground">This source could not be loaded. Please try another channel.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-sm">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{displayInfo?.title}</p>
          <p className="text-xs text-muted-foreground">
            {displayInfo?.year && displayInfo.year}
            {details.vote_average > 0 && ` · ⭐ ${details.vote_average.toFixed(1)}`}
            {mediaType === "tv" && ` · S${season} · E${episode}`}
          </p>
        </div>
        <button
          onClick={toggleFullscreen}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* Channel switcher */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto">
        {CHANNELS.map((ch, i) => (
          <button
            key={ch.id}
            onClick={() => handleChannelSwitch(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              ch.disabled
                ? "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                : i === activeChannel
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {ch.name}
            {ch.disabled && <span className="ml-1 text-[10px] opacity-60">({ch.label})</span>}
          </button>
        ))}

        {/* Sub/Dub toggle — anime only */}
        {animeTitle && (
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
        )}
      </div>

      {/* Player container */}
      <div className="flex justify-center px-4 py-2">
        <div className="w-full max-w-[1100px]">
          <div
            ref={videoWrapperRef}
            className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black"
            onClick={resetHideTimer}
          >
            {playerUrl ? (
              <iframe
                key={`${playerUrl}-${subDub}`}
                src={playerUrl}
                className="w-full h-full border-0"
                allowFullScreen
                allow="autoplay; encrypted-media; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">Select a channel to start playback</p>
              </div>
            )}

            {/* Gesture overlay — tap to show/hide controls */}
            <div
              className="absolute inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setControlsVisible((v) => !v);
                resetHideTimer();
              }}
              style={{ background: "transparent" }}
            />

            {/* Minimal overlay controls (fullscreen button) */}
            <div
              className={`absolute bottom-3 right-3 z-20 transition-opacity duration-300 ${
                controlsVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="w-10 h-10 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background/90 transition-colors"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Episode navigation */}
      {mediaType === "tv" && (
        <div className="flex items-center justify-between px-4 py-3 max-w-[1100px] mx-auto">
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
