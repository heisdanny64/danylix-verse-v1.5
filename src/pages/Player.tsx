import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Hls from "hls.js";
import {
  ArrowLeft,
  Play,
  Pause,
  Rewind,
  FastForward,
  SkipBack,
  SkipForward,
  Settings,
  RotateCw,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Subtitles as SubtitlesIcon,
  Gauge,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { getMovieDetails, getSeasonDetails, getDisplayInfo } from "@/lib/tmdb";
import { getAnimeDetails } from "@/lib/anilist";
import { useLibrary } from "@/lib/library";
import {
  findBestMatch,
  getGiftedSources,
  resolveAnimeEpisode,
  type GiftedSource,
  type GiftedSubtitle,
} from "@/services/giftedApi";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type SettingsView = "root" | "quality" | "subtitle" | "speed";
const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0] as const;

function fmtTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function qualityRank(q: string): number {
  const m = String(q).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

export default function Player() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateProgress } = useLibrary();
  const { user } = useAuth();

  const contentType = (type as "movie" | "tv" | "anime") || "movie";
  const isAnime = contentType === "anime";
  const numericId = Number(id);
  const season = Number(searchParams.get("season")) || 1;
  const episode = Number(searchParams.get("episode")) || 1;

  // Metadata
  const { data: tmdbDetails } = useQuery({
    queryKey: ["player-detail", contentType, numericId],
    queryFn: () => getMovieDetails(numericId, contentType as "movie" | "tv"),
    enabled: !isAnime && !!numericId,
  });
  const { data: animeDetails } = useQuery({
    queryKey: ["player-anime-detail", numericId],
    queryFn: () => getAnimeDetails(numericId),
    enabled: isAnime && !!numericId,
  });
  const { data: seasonData } = useQuery({
    queryKey: ["player-season", numericId, season],
    queryFn: () => getSeasonDetails(numericId, season),
    enabled: contentType === "tv" && !!numericId,
  });

  const title = isAnime
    ? animeDetails?.title || ""
    : tmdbDetails ? getDisplayInfo(tmdbDetails as any).title : "";
  const year = isAnime
    ? animeDetails?.year ?? null
    : tmdbDetails ? getDisplayInfo(tmdbDetails as any).year ?? null : null;

  const totalEpisodes = isAnime
    ? animeDetails?.episodes || 0
    : seasonData?.episodes?.length || 0;
  const isMovie = contentType === "movie";
  const hasNext = !isMovie && (totalEpisodes === 0 || episode < totalEpisodes);
  const hasPrev = !isMovie && episode > 1;

  // Resolved subjectId for Gifted
  const matchEnabled = !!title;
  const { data: subjectId, isLoading: matchingId, refetch: refetchMatch } = useQuery({
    queryKey: ["gifted-match", contentType, numericId, title, year],
    queryFn: () =>
      findBestMatch({
        title,
        year: year as number | null,
        type: contentType,
        externalId: numericId,
      }),
    enabled: matchEnabled,
    staleTime: 30 * 60 * 1000,
  });

  // Resolve absolute episode for anime sequels
  const { data: absEpisode } = useQuery({
    queryKey: ["anime-abs-ep", numericId, episode],
    queryFn: () => resolveAnimeEpisode(numericId, episode),
    enabled: isAnime && !!numericId,
  });

  const sourceSeason = isAnime ? undefined : isMovie ? undefined : season;
  const sourceEpisode = isAnime
    ? absEpisode ?? episode
    : isMovie
      ? undefined
      : episode;

  // Sources
  const {
    data: sourcesData,
    isLoading: loadingSources,
    refetch: refetchSources,
    isError: sourcesError,
  } = useQuery({
    queryKey: ["gifted-sources", subjectId, sourceSeason, sourceEpisode],
    queryFn: () => getGiftedSources(subjectId!, sourceSeason, sourceEpisode),
    enabled: !!subjectId && (!isAnime || absEpisode !== undefined),
  });

  const sources: GiftedSource[] = useMemo(
    () =>
      [...(sourcesData?.results || [])].sort(
        (a, b) => qualityRank(b.quality) - qualityRank(a.quality),
      ),
    [sourcesData],
  );
  const subtitles: GiftedSubtitle[] = sourcesData?.subtitles || [];

  const [qualityIdx, setQualityIdx] = useState<number>(0); // 0 = highest = "Auto"
  const [subtitleIdx, setSubtitleIdx] = useState<number>(-1); // -1 = Off
  const [speed, setSpeed] = useState<number>(1.0);
  // Source-fallback chain: 0 = proxy stream_url, 2 = download_url
  const [sourceTier, setSourceTier] = useState<0 | 2>(0);

  // Reset selections when sources change
  useEffect(() => {
    setQualityIdx(0);
    setSubtitleIdx(-1);
  }, [subjectId, sourceEpisode]);

  const activeSource = sources[qualityIdx] || sources[0];
  const proxyUrl = activeSource?.stream_url || "";
  const downloadUrl = activeSource?.download_url || "";

  // Always use proxy first; only fall back to download_url if proxy fails
  const streamUrl =
    sourceTier === 2 && downloadUrl
      ? downloadUrl
      : proxyUrl;

  // Reset tier when sources change
  useEffect(() => {
    setSourceTier(0);
  }, [proxyUrl, qualityIdx, subjectId]);

  // Player state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<number | null>(null);
  const tapTimerRef = useRef<number | null>(null);
  const tapCountRef = useRef(0);
  const lastTapXRef = useRef(0);
  const persistTimer = useRef<number | null>(null);
  const wasPlayingRef = useRef(false);
  const initialResumeAppliedRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [bufferLoading, setBufferLoading] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const [seekIndicator, setSeekIndicator] = useState<{ side: "left" | "right"; visible: boolean }>({ side: "left", visible: false });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("root");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-next overlay
  const [autoNext, setAutoNext] = useState<number | null>(null);
  const autoNextTimer = useRef<number | null>(null);

  // Resume position to apply on next loadedmetadata
  const resumeRef = useRef<number>(0);

  // Advance through the fallback chain: proxy -> download -> next quality -> error
  const advanceFallback = useCallback(() => {
    setSourceTier((prev) => {
      if (prev === 0) {
        if (downloadUrl) {
          console.warn("[Player] Proxy failed, falling back to download_url");
          return 2;
        }
        // No download URL — try next quality directly
        if (qualityIdx + 1 < sources.length) {
          console.warn("[Player] Proxy failed and no download_url, trying next quality");
          setQualityIdx((i) => i + 1);
          return 0;
        }
        console.error("[Player] All sources exhausted");
        setStreamError(true);
        setBufferLoading(false);
        return prev;
      }
      // prev === 2 (download_url failed) — try next quality
      if (qualityIdx + 1 < sources.length) {
        console.warn("[Player] All tiers failed, trying next quality");
        setQualityIdx((i) => i + 1);
        return 0;
      }
      console.error("[Player] All sources exhausted");
      setStreamError(true);
      setBufferLoading(false);
      return prev;
    });
  }, [downloadUrl, qualityIdx, sources.length]);

  // Load HLS / native source
  useEffect(() => {
    setStreamError(false);
    setBufferLoading(true);
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    // Diagnostic logs
    console.log("[Player] Loading source", {
      tier: sourceTier,
      qualityIdx,
      quality: activeSource?.quality,
      streamUrl,
      hasDirect: !!directUrl,
      hasDownload: !!downloadUrl,
    });

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isM3u8 = /\.m3u8(\?|$)/i.test(streamUrl);

    const handleReady = () => {
      setBufferLoading(false);
      if (resumeRef.current > 0) {
        try { video.currentTime = resumeRef.current; } catch { /* noop */ }
        resumeRef.current = 0;
      }
      // Honor previous play-state when swapping sources
      if (wasPlayingRef.current || !initialResumeAppliedRef.current) {
        video.play().catch(() => { /* autoplay blocked */ });
      }
      initialResumeAppliedRef.current = true;
    };

    if (isM3u8 && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, handleReady);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        console.error("[Player] HLS error", { fatal: data.fatal, type: data.type, details: data.details });
        if (data.fatal) {
          advanceFallback();
        }
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else {
      // Native MP4 / direct URL — set explicit type hint and load
      video.src = streamUrl;
      video.setAttribute("type", "video/mp4");
      try { video.load(); } catch { /* noop */ }
      video.addEventListener("loadedmetadata", handleReady, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl, advanceFallback]);

  // Video listeners
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => {
      setPlaying(true);
      wasPlayingRef.current = true;
    };
    const onPause = () => {
      setPlaying(false);
      wasPlayingRef.current = false;
    };
    const onTime = () => setPosition(v.currentTime);
    const onDur = () => setDuration(v.duration);
    const onWait = () => setBufferLoading(true);
    const onCanPlay = () => setBufferLoading(false);
    const onErr = () => {
      console.error("[Player] Native video error", v.error);
      advanceFallback();
    };
    const onEnded = () => {
      if (hasNext) setAutoNext(5);
      else setPlaying(false);
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("waiting", onWait);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onErr);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("waiting", onWait);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onErr);
      v.removeEventListener("ended", onEnded);
    };
  }, [advanceFallback, hasNext]);

  // Speed
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  // Quality switch: preserve position
  useEffect(() => {
    resumeRef.current = position;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualityIdx]);

  // Persist progress every 5s
  useEffect(() => {
    if (persistTimer.current) window.clearInterval(persistTimer.current);
    persistTimer.current = window.setInterval(() => {
      if (!duration || !position) return;
      const pct = Math.min(100, Math.round((position / duration) * 100));
      if (isAnime && animeDetails) {
        const m = {
          id: animeDetails.id,
          title: animeDetails.title,
          overview: animeDetails.description,
          poster_path: animeDetails.coverImage?.large,
          backdrop_path: animeDetails.bannerImage,
          vote_average: (animeDetails.averageScore || 0) / 10,
          release_date: animeDetails.startDate ? `${animeDetails.startDate.year}-01-01` : "",
        };
        updateProgress(m, "anime", pct, 1, episode);
      } else if (tmdbDetails) {
        updateProgress(tmdbDetails as any, contentType as any, pct, season, episode);
      }
    }, 5000);
    return () => {
      if (persistTimer.current) window.clearInterval(persistTimer.current);
    };
  }, [duration, position, isAnime, animeDetails, tmdbDetails, contentType, season, episode, updateProgress]);

  // Controls visibility
  const triggerControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (playing && !settingsOpen) setShowControls(false);
    }, 3000);
  }, [playing, settingsOpen]);

  useEffect(() => {
    triggerControls();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [triggerControls]);

  // Fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
        triggerControls();
      } else if (e.key === "f") {
        toggleFullscreen();
      } else if (e.key === "ArrowLeft") {
        if (videoRef.current) videoRef.current.currentTime -= 10;
        triggerControls();
      } else if (e.key === "ArrowRight") {
        if (videoRef.current) videoRef.current.currentTime += 10;
        triggerControls();
      } else if (e.key === "Escape" && settingsOpen) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleFullscreen, triggerControls, settingsOpen]);

  // Auto-next timer
  useEffect(() => {
    if (autoNext === null) return;
    if (autoNext <= 0) {
      navigate(`/player/${type}/${id}?season=${season}&episode=${episode + 1}`);
      setAutoNext(null);
      return;
    }
    autoNextTimer.current = window.setTimeout(() => {
      setAutoNext((n) => (n !== null ? n - 1 : null));
    }, 1000);
    return () => {
      if (autoNextTimer.current) window.clearTimeout(autoNextTimer.current);
    };
  }, [autoNext, navigate, type, id, season, episode]);

  const handleSeek = (val: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = val[0];
      setPosition(val[0]);
    }
  };

  const handleVolume = (val: number[]) => {
    const v = val[0];
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
    setMuted(v === 0);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  };

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const x = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relativeX = x - rect.left;
    const isSide = relativeX < rect.width * 0.3 || relativeX > rect.width * 0.7;

    if (isSide && tapCountRef.current > 0 && now - (tapTimerRef.current || 0) < 300) {
      // Double tap
      tapCountRef.current = 0;
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
      
      if (relativeX < rect.width * 0.3) {
        if (videoRef.current) videoRef.current.currentTime -= 10;
        setSeekIndicator({ side: "left", visible: true });
      } else {
        if (videoRef.current) videoRef.current.currentTime += 10;
        setSeekIndicator({ side: "right", visible: true });
      }
      setTimeout(() => setSeekIndicator((s) => ({ ...s, visible: false })), 600);
    } else {
      tapCountRef.current = 1;
      tapTimerRef.current = window.setTimeout(() => {
        tapCountRef.current = 0;
        if (!settingsOpen) {
          if (showControls) setShowControls(false);
          else triggerControls();
        }
      }, 300);
    }
  };

  if (matchingId || loadingSources) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 z-50">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-white/60 animate-pulse text-sm font-medium">
          {matchingId ? "Matching content..." : "Fetching sources..."}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 bg-black flex items-center justify-center overflow-hidden select-none group",
        isFullscreen ? "cursor-none" : "cursor-default",
        showControls && "cursor-default"
      )}
      onMouseMove={triggerControls}
      onClick={handleTap}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        crossOrigin="anonymous"
      >
        {subtitles[subtitleIdx] && (
          <track
            kind="subtitles"
            src={subtitles[subtitleIdx].url}
            srcLang={subtitles[subtitleIdx].lan}
            label={subtitles[subtitleIdx].lanName}
            default
          />
        )}
      </video>

      {/* Buffering / Error Overlays */}
      {bufferLoading && !streamError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}

      {streamError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 p-6 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Playback Error</h2>
          <p className="text-white/60 max-w-md mb-6">
            We couldn't load the video stream. This might be due to a temporary server issue or an expired link.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-6 py-2 bg-white/10 text-white rounded-full font-medium hover:bg-white/20 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Double Tap Seek Indicators */}
      <div className={cn(
        "absolute left-[15%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 transition-opacity duration-300 pointer-events-none",
        seekIndicator.side === "left" && seekIndicator.visible ? "opacity-100" : "opacity-0"
      )}>
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
          <Rewind className="w-8 h-8 text-white fill-white" />
        </div>
        <span className="text-white font-bold">10s</span>
      </div>
      <div className={cn(
        "absolute right-[15%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 transition-opacity duration-300 pointer-events-none",
        seekIndicator.side === "right" && seekIndicator.visible ? "opacity-100" : "opacity-0"
      )}>
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
          <FastForward className="w-8 h-8 text-white fill-white" />
        </div>
        <span className="text-white font-bold">10s</span>
      </div>

      {/* Top Controls */}
      <div className={cn(
        "absolute top-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-b from-black/80 to-transparent transition-all duration-500 z-40",
        showControls ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}>
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(-1); }}
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-white font-bold text-lg md:text-xl line-clamp-1">
              {title}
            </h1>
            {!isMovie && (
              <p className="text-white/60 text-sm font-medium">
                S{season} : E{episode}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-all duration-500 z-40",
        showControls ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}>
        {/* Progress Bar */}
        <div className="group/progress relative w-full h-1.5 mb-6 cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-white/20 rounded-full" />
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full"
            style={{ width: `${(position / duration) * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={position}
            onChange={(e) => handleSeek([parseFloat(e.target.value)])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform"
            style={{ left: `${(position / duration) * 100}%`, marginLeft: "-8px" }}
          />
          <div className="absolute -top-8 left-0 text-xs text-white/60 font-medium">
            {fmtTime(position)}
          </div>
          <div className="absolute -top-8 right-0 text-xs text-white/60 font-medium">
            {fmtTime(duration)}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 md:gap-6">
            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime -= 10;
              }}
              className="p-2 text-white hover:text-primary transition-colors"
            >
              <Rewind className="w-6 h-6 md:w-7 md:h-7" />
            </button>

            <button
              onClick={() => setPlaying(!playing)}
              className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform"
            >
              {playing ? (
                <Pause className="w-6 h-6 md:w-7 md:h-7 fill-current" />
              ) : (
                <Play className="w-6 h-6 md:w-7 md:h-7 fill-current ml-1" />
              )}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime += 10;
              }}
              className="p-2 text-white hover:text-primary transition-colors"
            >
              <FastForward className="w-6 h-6 md:w-7 md:h-7" />
            </button>

            <div className="hidden md:flex items-center gap-4 ml-4 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                {muted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <div className="w-24 h-1 relative bg-white/20 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-white"
                  style={{ width: `${volume * 100}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => handleVolume([parseFloat(e.target.value)])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {!isMovie && (
              <>
                <button
                  disabled={!hasPrev}
                  onClick={() => navigate(`/player/${type}/${id}?season=${season}&episode=${episode - 1}`)}
                  className="p-2 text-white hover:text-primary disabled:opacity-30 disabled:hover:text-white transition-colors"
                  title="Previous Episode"
                >
                  <SkipBack className="w-6 h-6" />
                </button>
                <button
                  disabled={!hasNext}
                  onClick={() => navigate(`/player/${type}/${id}?season=${season}&episode=${episode + 1}`)}
                  className="p-2 text-white hover:text-primary disabled:opacity-30 disabled:hover:text-white transition-colors"
                  title="Next Episode"
                >
                  <SkipForward className="w-6 h-6" />
                </button>
              </>
            )}

            <button
              onClick={() => {
                setSettingsView("root");
                setSettingsOpen(!settingsOpen);
              }}
              className={cn(
                "p-2 text-white hover:text-primary transition-all",
                settingsOpen && "rotate-90 text-primary"
              )}
            >
              <Settings className="w-6 h-6" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 text-white hover:text-primary transition-colors"
            >
              {isFullscreen ? (
                <X className="w-6 h-6" />
              ) : (
                <Sliders className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Settings Menu */}
      {settingsOpen && (
        <div
          className="absolute right-4 md:right-8 bottom-24 md:bottom-32 w-64 bg-black/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2">
            {settingsView === "root" && (
              <div className="flex flex-col">
                <button
                  onClick={() => setSettingsView("quality")}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/10 text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Sliders className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Quality</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">
                      {activeSource?.quality || "Auto"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </div>
                </button>

                <button
                  onClick={() => setSettingsView("subtitle")}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/10 text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <SubtitlesIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Subtitles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">
                      {subtitleIdx === -1 ? "Off" : subtitles[subtitleIdx]?.lanName}
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </div>
                </button>

                <button
                  onClick={() => setSettingsView("speed")}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/10 text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Gauge className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Speed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">{speed}x</span>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </div>
                </button>
              </div>
            )}

            {settingsView === "quality" && (
              <div className="flex flex-col">
                <button
                  onClick={() => setSettingsView("root")}
                  className="flex items-center gap-3 p-3 text-white/60 hover:text-white transition-colors mb-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Quality</span>
                </button>
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  {sources.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQualityIdx(i);
                        setSettingsOpen(false);
                      }}
                      className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-white/10 text-white transition-colors"
                    >
                      <span className={cn("text-sm", qualityIdx === i ? "text-primary font-bold" : "font-medium")}>
                        {s.quality}
                      </span>
                      {qualityIdx === i && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {settingsView === "subtitle" && (
              <div className="flex flex-col">
                <button
                  onClick={() => setSettingsView("root")}
                  className="flex items-center gap-3 p-3 text-white/60 hover:text-white transition-colors mb-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Subtitles</span>
                </button>
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  <button
                    onClick={() => {
                      setSubtitleIdx(-1);
                      setSettingsOpen(false);
                    }}
                    className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-white/10 text-white transition-colors"
                  >
                    <span className={cn("text-sm", subtitleIdx === -1 ? "text-primary font-bold" : "font-medium")}>
                      Off
                    </span>
                    {subtitleIdx === -1 && <Check className="w-4 h-4 text-primary" />}
                  </button>
                  {subtitles.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSubtitleIdx(i);
                        setSettingsOpen(false);
                      }}
                      className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-white/10 text-white transition-colors"
                    >
                      <span className={cn("text-sm", subtitleIdx === i ? "text-primary font-bold" : "font-medium")}>
                        {s.lanName}
                      </span>
                      {subtitleIdx === i && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {settingsView === "speed" && (
              <div className="flex flex-col">
                <button
                  onClick={() => setSettingsView("root")}
                  className="flex items-center gap-3 p-3 text-white/60 hover:text-white transition-colors mb-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Playback Speed</span>
                </button>
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSpeed(s);
                      setSettingsOpen(false);
                    }}
                    className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-white/10 text-white transition-colors"
                  >
                    <span className={cn("text-sm", speed === s ? "text-primary font-bold" : "font-medium")}>
                      {s}x
                    </span>
                    {speed === s && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto-next Overlay */}
      {autoNext !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[60] animate-in fade-in duration-500">
          <div className="flex flex-col items-center text-center p-8">
            <span className="text-primary font-bold uppercase tracking-[0.2em] mb-2">Next Episode In</span>
            <span className="text-7xl md:text-8xl font-black text-white mb-8">{autoNext}</span>
            <div className="flex gap-4">
              <button
                onClick={() => setAutoNext(null)}
                className="px-8 py-3 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate(`/player/${type}/${id}?season=${season}&episode=${episode + 1}`)}
                className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
              >
                Play Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
