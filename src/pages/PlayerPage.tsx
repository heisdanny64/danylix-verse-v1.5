import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Minimize, Play, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { CHANNELS, ANIME_CHANNELS } from "@/lib/player";
import { getMovieDetails, getSeasonDetails, getDisplayInfo } from "@/lib/tmdb";
import { getAnimeDetails } from "@/lib/anilist";
import { useLibrary } from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import HlsPlayer from "@/components/HlsPlayer";

type PlayerState = "loading" | "ready" | "error";

const PlayerPage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeChannel, setActiveChannel] = useState(0);
  const [subDub, setSubDub] = useState<"sub" | "dub">("sub");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shieldActive, setShieldActive] = useState(true);
  const [playerState, setPlayerState] = useState<PlayerState>("loading");
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const { updateProgress } = useLibrary();

  const contentType = (type as "movie" | "tv" | "anime") || "movie";
  const isAnimeContent = contentType === "anime";
  const numericId = Number(id);
  const season = Number(searchParams.get("season")) || 1;
  const episode = Number(searchParams.get("episode")) || 1;

  // TMDB details (movie/tv only)
  const { data: tmdbDetails, isLoading: tmdbLoading } = useQuery({
    queryKey: ["player-detail", contentType, numericId],
    queryFn: () => getMovieDetails(numericId, contentType as "movie" | "tv"),
    enabled: !isAnimeContent && !!numericId,
  });

  // AniList details (anime only)
  const { data: animeDetails, isLoading: animeLoading } = useQuery({
    queryKey: ["player-anime-detail", numericId],
    queryFn: () => getAnimeDetails(numericId),
    enabled: isAnimeContent && !!numericId,
  });

  const { data: seasonData } = useQuery({
    queryKey: ["player-season", numericId, season],
    queryFn: () => getSeasonDetails(numericId, season),
    enabled: contentType === "tv" && !!numericId,
  });

  const detailsLoading = isAnimeContent ? animeLoading : tmdbLoading;
  const hasDetails = isAnimeContent ? !!animeDetails : !!tmdbDetails;

  const totalEpisodes = isAnimeContent
    ? (animeDetails?.episodes || 0)
    : (seasonData?.episodes?.length || 0);
  const canPrev = (contentType === "tv" || isAnimeContent) && episode > 1;
  const canNext = (contentType === "tv" || isAnimeContent) && episode < totalEpisodes;

  const availableChannels = isAnimeContent ? ANIME_CHANNELS : CHANNELS;
  const channel = availableChannels[activeChannel] || availableChannels[0];
  const playerUrl = (!channel.disabled && numericId)
    ? channel.getUrl(contentType, numericId, season, episode, subDub)
    : "";

  const displayTitle = isAnimeContent
    ? animeDetails?.title || "Loading..."
    : tmdbDetails ? getDisplayInfo(tmdbDetails as any).title : "Loading...";
  const displayYear = isAnimeContent
    ? animeDetails?.year
    : tmdbDetails ? getDisplayInfo(tmdbDetails as any).year : null;
  const displayRating = isAnimeContent
    ? animeDetails?.rating
    : tmdbDetails?.vote_average;

  // Save progress for movie/tv
  useEffect(() => {
    if (!isAnimeContent && tmdbDetails) {
      const movie = {
        id: tmdbDetails.id,
        title: tmdbDetails.title,
        name: tmdbDetails.name,
        overview: tmdbDetails.overview,
        poster_path: tmdbDetails.poster_path,
        backdrop_path: tmdbDetails.backdrop_path,
        vote_average: tmdbDetails.vote_average,
        release_date: tmdbDetails.release_date,
        first_air_date: tmdbDetails.first_air_date,
        genre_ids: tmdbDetails.genres.map((g: any) => g.id),
        media_type: contentType,
        original_language: tmdbDetails.original_language,
      };
      updateProgress(movie, contentType as "movie" | "tv", 10, season, episode);
    }
  }, [tmdbDetails, contentType, season, episode]);

  // Save progress for anime
  useEffect(() => {
    if (isAnimeContent && animeDetails) {
      const movie = {
        id: animeDetails.id,
        title: animeDetails.title,
        overview: animeDetails.description,
        poster_path: animeDetails.poster,
        backdrop_path: animeDetails.banner,
        vote_average: animeDetails.rating,
        release_date: animeDetails.year ? `${animeDetails.year}-01-01` : "",
        genre_ids: [],
        media_type: "anime",
        _isAnimeCard: true,
      };
      updateProgress(movie as any, "anime", 10, 1, episode);
    }
  }, [animeDetails, episode]);

  // Reset state when channel or URL changes
  useEffect(() => {
    if (channel.type === "iframe") {
      setShieldActive(true);
      setPlayerState("loading");
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = setTimeout(() => {
        setPlayerState((prev) => (prev === "loading" ? "ready" : prev));
      }, 10000);
    }
    return () => { if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current); };
  }, [playerUrl, activeChannel, channel.type]);

  // Auto-fallback for movie/tv only
  useEffect(() => {
    if (isAnimeContent) return;
    if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
    fallbackTimeoutRef.current = setTimeout(() => {
      if (playerState === "loading" && activeChannel < availableChannels.length - 1) {
        toast({ title: `Switching to ${availableChannels[activeChannel + 1].name}...`, description: "Stream unavailable, trying alternative source." });
        setActiveChannel((prev) => prev + 1);
      }
    }, 7000);
    return () => {
      if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
    };
  }, [activeChannel, isAnimeContent, playerState]);

  useEffect(() => {
    if (import.meta.env.DEV && playerUrl) {
      console.log("[Player Debug]", {
        channel: channel.name,
        type: channel.type,
        url: playerUrl,
        contentType,
        id: numericId,
        season: contentType !== "movie" ? season : undefined,
        episode: contentType !== "movie" ? episode : undefined,
        subDub: isAnimeContent ? subDub : undefined,
      });
    }
  }, [playerUrl, activeChannel]);

  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) {
        try { (screen.orientation as any)?.unlock?.(); } catch {}
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setPlayerState("ready");
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
  }, []);

  const goEpisode = (ep: number) => {
    if (isAnimeContent) {
      navigate(`/player/anime/${numericId}?season=1&episode=${ep}`, { replace: true });
    } else {
      navigate(`/player/tv/${numericId}?season=${season}&episode=${ep}`, { replace: true });
    }
  };

  const handleChannelSwitch = (index: number) => {
    const ch = availableChannels[index];
    if (ch.disabled) {
      toast({ title: "Channel unavailable", description: "This channel is not available." });
      return;
    }
    setActiveChannel(index);
    setPlayerState("loading");
  };

  const handleHlsError = useCallback(() => {
    if (isAnimeContent) {
      toast({ title: "Stream unavailable", description: "Could not load anime stream. Please try again later." });
      return;
    }
    const nextIndex = activeChannel + 1;
    if (nextIndex < availableChannels.length) {
      toast({ title: `Switching to ${availableChannels[nextIndex].name}...`, description: "Stream unavailable, trying alternative source." });
      setActiveChannel(nextIndex);
    } else {
      toast({ title: "All channels unavailable", description: "Could not load from any source." });
    }
  }, [isAnimeContent, activeChannel, availableChannels]);

  const toggleFullscreen = async () => {
    const el = videoWrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen();
        try { await (screen.orientation as any)?.lock?.("landscape"); } catch {}
      } catch (e) {
        console.warn("Fullscreen request failed", e);
      }
    } else {
      try { await document.exitFullscreen(); } catch {}
    }
  };

  const handleRetry = () => {
    setPlayerState("loading");
    setShieldActive(true);
    const current = activeChannel;
    setActiveChannel(-1);
    setTimeout(() => setActiveChannel(current), 50);
  };

  const dismissShield = () => {
    setShieldActive(false);
    setPlayerState("ready");
  };

  if (detailsLoading || !hasDetails) {
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

  const isHls = channel.type === "hls";
  const isIframe = channel.type === "iframe";

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-sm">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{displayTitle}</p>
          <p className="text-xs text-muted-foreground">
            {displayYear && displayYear}
            {displayRating && displayRating > 0 && ` · ⭐ ${displayRating.toFixed(1)}`}
            {contentType !== "movie" && ` · E${episode}`}
          </p>
        </div>
        {!isHls && (
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        )}
      </div>

      <div className="flex gap-2 px-4 py-2 overflow-x-auto items-center">
        {availableChannels.map((ch, i) => (
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
          </button>
        ))}

        {isAnimeContent && (
          <div className="flex items-center gap-2 ml-auto">
            <span className={`text-xs font-medium ${subDub === "sub" ? "text-primary" : "text-muted-foreground"}`}>Sub</span>
            <Switch
              checked={subDub === "dub"}
              onCheckedChange={(checked) => setSubDub(checked ? "dub" : "sub")}
            />
            <span className={`text-xs font-medium ${subDub === "dub" ? "text-primary" : "text-muted-foreground"}`}>Dub</span>
          </div>
        )}
      </div>

      <div className="flex justify-center px-4 py-2">
        <div className="w-full max-w-[1100px]">
          <div
            ref={videoWrapperRef}
            className={`relative w-full overflow-hidden bg-black ${
              isFullscreen ? "fixed inset-0 z-50 rounded-none" : "aspect-video rounded-2xl"
            }`}
          >
            {isHls && playerUrl && (
              <HlsPlayer
                src={playerUrl}
                onError={handleHlsError}
                onReady={() => setPlayerState("ready")}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
              />
            )}

            {isIframe && playerUrl && activeChannel >= 0 && (
              <>
                <iframe
                  key={`${playerUrl}-${subDub}-${activeChannel}`}
                  src={playerUrl}
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow={channel.allow}
                  {...(channel.sandbox ? { sandbox: channel.sandbox } : {})}
                  onLoad={handleIframeLoad}
                  referrerPolicy="origin-when-cross-origin"
                />

                {shieldActive && (
                  <div
                    className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
                    onClick={dismissShield}
                    style={{ background: "rgba(0,0,0,0.3)" }}
                  >
                    <div className="flex flex-col items-center gap-3 text-center">
                      {playerState === "loading" && (
                        <>
                          <Loader2 className="w-10 h-10 text-primary animate-spin" />
                          <p className="text-sm text-white/80">Loading {channel.name}...</p>
                        </>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); dismissShield(); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Play className="w-4 h-4" /> Tap to Watch
                      </button>
                      <p className="text-xs text-white/50">Shield active — blocks ad clicks</p>
                    </div>
                  </div>
                )}

                {!shieldActive && (
                  <button
                    onClick={() => setShieldActive(true)}
                    className="absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center text-foreground/70 hover:bg-background/80 transition-colors"
                    title="Re-enable ad shield"
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  className="absolute bottom-3 right-3 z-20 w-10 h-10 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background/90 transition-colors"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </>
            )}

            {!playerUrl && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">Select a channel to start playback</p>
              </div>
            )}
          </div>

          {isIframe && playerState === "error" && (
            <div className="mt-4 p-4 rounded-xl bg-card border border-border text-center space-y-3">
              <p className="text-sm font-medium text-foreground">Source unavailable — {channel.name}</p>
              <p className="text-xs text-muted-foreground">This channel could not load. Try another channel or retry.</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRetry} className="gap-1">
                  <RefreshCw className="w-3 h-3" /> Retry
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {contentType !== "movie" && (
        <div className="flex items-center justify-between px-4 py-3 max-w-[1100px] mx-auto">
          <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => goEpisode(episode - 1)} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Episode {episode}{totalEpisodes ? ` of ${totalEpisodes}` : ""}
          </span>
          <Button variant="outline" size="sm" disabled={!canNext} onClick={() => goEpisode(episode + 1)} className="gap-1">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PlayerPage;
