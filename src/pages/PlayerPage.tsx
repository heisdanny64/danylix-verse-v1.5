import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Minimize, Play, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { CHANNELS } from "@/lib/player";
import { getMovieDetails, getSeasonDetails, getDisplayInfo, isAnime } from "@/lib/tmdb";
import { useLibrary } from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  const channel = CHANNELS[activeChannel] || CHANNELS[0];
  const playerUrl = (!channel.disabled && tmdbId) ? channel.getUrl(mediaType, tmdbId, season, episode) : "";
  const displayInfo = details ? getDisplayInfo(details as any) : null;

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
        genre_ids: details.genres.map((g: any) => g.id),
        media_type: mediaType,
        original_language: details.original_language,
      };
      updateProgress(movie, mediaType, 10, season, episode);
    }
  }, [details, mediaType, season, episode]);

  // Reset state when channel or URL changes (iframe only)
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

  // Dev logging
  useEffect(() => {
    if (import.meta.env.DEV && playerUrl) {
      console.log("[Player Debug]", {
        channel: channel.name,
        type: channel.type,
        url: playerUrl,
        mediaType,
        tmdbId,
        season: mediaType === "tv" ? season : undefined,
        episode: mediaType === "tv" ? episode : undefined,
      });
    }
  }, [playerUrl, activeChannel]);

  // Fullscreen change listener
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
  }, []);

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
    setPlayerState("loading");
  };

  const handleHlsError = useCallback(() => {
    // Auto-fallback to Channel 2
    toast({ title: "Switching to Channel 2...", description: "Stream unavailable, trying alternative source." });
    setActiveChannel(1);
  }, []);

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

  const isHls = channel.type === "hls";
  const isIframe = channel.type === "iframe";

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
        {!isHls && (
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        )}
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
            className={`relative w-full overflow-hidden bg-black ${
              isFullscreen ? "fixed inset-0 z-50 rounded-none" : "aspect-video rounded-2xl"
            }`}
          >
            {/* HLS Player */}
            {isHls && playerUrl && (
              <HlsPlayer
                src={playerUrl}
                onError={handleHlsError}
                onReady={() => setPlayerState("ready")}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
              />
            )}

            {/* Iframe Player */}
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

                {/* Shield overlay for iframe channels */}
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

                {/* Re-shield button */}
                {!shieldActive && (
                  <button
                    onClick={() => setShieldActive(true)}
                    className="absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center text-foreground/70 hover:bg-background/80 transition-colors"
                    title="Re-enable ad shield"
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                )}

                {/* Fullscreen button overlay for iframe */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  className="absolute bottom-3 right-3 z-20 w-10 h-10 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background/90 transition-colors"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </>
            )}

            {/* No URL state */}
            {!playerUrl && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">Select a channel to start playback</p>
              </div>
            )}
          </div>

          {/* Error state (iframe only) */}
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

      {/* Episode navigation */}
      {mediaType === "tv" && (
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
