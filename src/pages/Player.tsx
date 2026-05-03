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
import { supabase } from "@/integrations/supabase/client";
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

  // FIX: Keep a ref to sources so tryNextQuality always reads the current
  // array length and never closes over a stale value from a previous render.
  const sourcesRef = useRef<GiftedSource[]>([]);
  sourcesRef.current = sources;

  const [qualityIdx, setQualityIdx] = useState<number>(0);
  const [subtitleIdx, setSubtitleIdx] = useState<number>(-1);
  const [speed, setSpeed] = useState<number>(1.0);

  // Reset selections when content changes
  useEffect(() => {
    setQualityIdx(0);
    setSubtitleIdx(-1);
  }, [subjectId, sourceEpisode]);

  const activeSource = sources[qualityIdx] || sources[0];
  // Use the Gifted API stream URL exactly as returned — no decoding, no rewriting.
  const streamUrl = activeSource?.stream_url || "";

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
  const tryNextQualityRef = useRef<() => void>(() => {});

  // FIX: Track whether the current streamUrl load is still valid.
  // Prevents stale error callbacks from a previous source triggering
  // tryNextQuality after the URL has already changed.
  const loadIdRef = useRef(0);

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

  // Load HLS / native MP4 source
  useEffect(() => {
    setStreamError(false);
    setBufferLoading(true);

    const video = videoRef.current;
    if (!video || !streamUrl) return;

    // Stamp this load so stale callbacks from a prior URL can self-cancel.
    const currentLoadId = ++loadIdRef.current;

    console.log("[Player] Loading source", {
      qualityIdx,
      quality: activeSource?.quality,
      streamUrl,
    });

    // Tear down any existing HLS instance before starting a new load.
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Abort any in-flight native load to prevent its error/loadedmetadata
    // events from firing after we've already moved to a new URL.
    video.pause();
    video.removeAttribute("src");
    video.load();

    const isM3u8 =
      /\.m3u8(\?|$)/i.test(streamUrl) ||
      /[?&]type=m3u8/i.test(streamUrl) ||
      /\/hls\//i.test(streamUrl);

    const handleReady = () => {
      // Ignore if this callback belongs to a superseded load.
      if (currentLoadId !== loadIdRef.current) return;
      setBufferLoading(false);
      if (resumeRef.current > 0) {
        try { video.currentTime = resumeRef.current; } catch { /* noop */ }
        resumeRef.current = 0;
      }
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
        if (currentLoadId !== loadIdRef.current) return;
        console.error("[Player] HLS error", { fatal: data.fatal, type: data.type, details: data.details });
        if (data.fatal) {
          tryNextQualityRef.current();
        }
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else if (isM3u8 && video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = streamUrl;
      try { video.load(); } catch { /* noop */ }
      video.addEventListener("loadedmetadata", handleReady, { once: true });
    } else {
      // Native MP4
      video.src = streamUrl;
      try { video.load(); } catch { /* noop */ }
      video.addEventListener("loadedmetadata", handleReady, { once: true });
    }

    return () => {
      // Invalidate this load so any pending callbacks are ignored.
      loadIdRef.current++;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      // Clean up native load so its events don't fire after unmount/re-run.
      video.removeEventListener("loadedmetadata", handleReady);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl]);

  // FIX: tryNextQuality reads sourcesRef.current (always fresh) instead of
  // closing over sources.length which was stale during the initial load race.
  const tryNextQuality = useCallback(() => {
    const currentSources = sourcesRef.current;
    if (qualityIdx + 1 < currentSources.length) {
      console.warn("[Player] Stream failed, trying next quality");
      setQualityIdx((i) => i + 1);
      return;
    }
    console.error("[Player] All qualities exhausted");
    setStreamError(true);
    setBufferLoading(false);
  }, [qualityIdx]);

  // Video event listeners
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setPosition(v.currentTime);
    const onDur = () => setDuration(v.duration);
    const onWait = () => setBufferLoading(true);
    const onCanPlay = () => setBufferLoading(false);
    const onErr = () => {
      // Ignore errors fired during a src="" reset (code 4 / no source).
      if (!v.src || v.src === window.location.href) return;
      const err = v.error;
      console.error("[Player] VIDEO ERROR", {
        code: err?.code,
        message: err?.message,
        currentSrc: v.currentSrc,
      });
      tryNextQualityRef.current();
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
  }, [hasNext]);

  useEffect(() => {
    tryNextQualityRef.current = tryNextQuality;
  }, [tryNextQuality]);

  // Speed
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  // Quality switch: preserve position + play state
  useEffect(() => {
    resumeRef.current = position;
    wasPlayingRef.current = playing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualityIdx]);

  // Toggle subtitle track visibility without remounting <track> elements
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tracks = v.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = i === subtitleIdx ? "showing" : "disabled";
    }
  }, [subtitleIdx, subtitles.length]);

  // Seed resume position from cloud on first load
  useEffect(() => {
    if (!user?.id || !numericId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("continue_watching")
        .select("current_time_sec, season, episode")
        .eq("user_id", user.id)
        .eq("content_id", String(numericId))
        .eq("content_type", contentType)
        .maybeSingle();
      if (cancelled || !data) return;
      if (
        (data.season ?? null) === (isMovie ? null : season) &&
        (data.episode ?? null) === (isMovie ? null : episode)
      ) {
        if (data.current_time_sec && data.current_time_sec > 5) {
          resumeRef.current = data.current_time_sec;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, numericId, contentType, season, episode, isMovie]);

  // Persist progress every 5s
  useEffect(() => {
    if (persistTimer.current) window.clearInterval(persistTimer.current);
    persistTimer.current = window.setInterval(() => {
      if (!duration || !position) return;
      const pct = Math.min(100, Math.round((position / duration) * 100));
      if (user?.id) {
        void supabase
          .from("continue_watching")
          .update({
            current_time_sec: position,
            duration_sec: duration,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("content_id", String(numericId))
          .eq("content_type", contentType);
      }
      if (isAnime && animeDetails) {
        const m = {
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
        } as any;
        updateProgress(m, "anime", pct, 1, episode);
      } else if (tmdbDetails) {
        const m = {
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
        } as any;
        updateProgress(m, contentType as "movie" | "tv", pct, season, episode);
      }
    }, 5000);
    return () => {
      if (persistTimer.current) window.clearInterval(persistTimer.current);
    };
  }, [position, duration, isAnime, animeDetails, tmdbDetails, contentType, season, episode, updateProgress]);

  // Fullscreen tracking
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Auto-next countdown
  useEffect(() => {
    if (autoNext == null) return;
    if (autoNext <= 0) {
      setAutoNext(null);
      goToEpisode(1);
      return;
    }
    autoNextTimer.current = window.setTimeout(() => setAutoNext((n) => (n != null ? n - 1 : null)), 1000);
    return () => {
      if (autoNextTimer.current) window.clearTimeout(autoNextTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoNext]);

  const cancelAutoNext = useCallback(() => {
    if (autoNextTimer.current) window.clearTimeout(autoNextTimer.current);
    setAutoNext(null);
  }, []);

  // Esc closes settings
  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSettingsOpen(false);
        setSettingsView("root");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen]);

  useEffect(() => {
    if (settingsOpen) setSettingsView("root");
  }, [settingsOpen]);

  // Auto-hide controls
  const flashControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => { flashControls(); }, [flashControls]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
  }, []);

  const goToEpisode = useCallback((delta: 1 | -1) => {
    const next = episode + delta;
    cancelAutoNext();
    if (isAnime) {
      navigate(`/player/anime/${numericId}?season=1&episode=${next}`, { replace: true });
    } else {
      navigate(`/player/tv/${numericId}?season=${season}&episode=${next}`, { replace: true });
    }
  }, [episode, isAnime, navigate, numericId, season, cancelAutoNext]);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        try { await (screen.orientation as any)?.lock?.("landscape"); } catch { /* noop */ }
      } else {
        try { (screen.orientation as any)?.unlock?.(); } catch { /* noop */ }
        await document.exitFullscreen();
      }
    } catch { /* noop */ }
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-controls]") || target.closest("[data-settings]")) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = "touches" in e
      ? (e as React.TouchEvent).changedTouches[0].clientX
      : (e as React.MouseEvent).clientX;
    const relX = (clientX - rect.left) / rect.width;

    tapCountRef.current += 1;
    lastTapXRef.current = relX;
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = window.setTimeout(() => {
      const count = tapCountRef.current;
      tapCountRef.current = 0;
      if (count >= 2) {
        if (lastTapXRef.current < 0.4) {
          seekBy(-10);
          setSeekIndicator({ side: "left", visible: true });
        } else if (lastTapXRef.current > 0.6) {
          seekBy(10);
          setSeekIndicator({ side: "right", visible: true });
        }
        window.setTimeout(() => setSeekIndicator((s) => ({ ...s, visible: false })), 600);
      } else {
        setShowControls((p) => !p);
        flashControls();
      }
    }, 250);
  }, [seekBy, flashControls]);

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, Math.min(duration, ratio * duration));
    flashControls();
  };

  if (!Number.isFinite(numericId)) {
    return <div className="p-8">Invalid content.</div>;
  }

  const pct = duration ? (position / duration) * 100 : 0;
  const initialLoading = matchingId || loadingSources;
  const noMatch = !matchingId && !subjectId && !!title;
  const noSources = !!subjectId && !loadingSources && sources.length === 0;
  const hasFatal = noMatch || noSources || (sourcesError && !sources.length) || streamError;

  const epLabel = isMovie ? "" : `S${season} · E${episode}`;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black text-foreground select-none"
      onMouseMove={flashControls}
      onClick={handleTap}
      onTouchEnd={handleTap}
    >
      {/*
        FIX: Removed crossOrigin="anonymous". The Gifted API returns a proxy
        stream_url that redirects to a CDN that does not send CORS headers.
        crossOrigin="anonymous" forces a CORS preflight which the CDN rejects,
        causing the browser to fire an error event → tryNextQuality exhausts
        all sources → "no playable sources" overlay. Plain MP4 playback does
        not require CORS at all.
      */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain bg-black"
        playsInline
        preload="metadata"
      >
        {subtitles.map((s, i) => (
          <track
            key={`${s.lan}-${i}-${s.url}`}
            kind="subtitles"
            src={s.url}
            label={s.lanName || s.lan || "Subtitle"}
            srcLang={s.lan || "en"}
            default={s.lan === "en" && i === subtitleIdx}
          />
        ))}
      </video>

      {/* Loading */}
      {(initialLoading || bufferLoading) && !hasFatal && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none z-10">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}

      {/* Seek indicator */}
      {seekIndicator.visible && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none",
            seekIndicator.side === "left" ? "left-8" : "right-8",
          )}
        >
          <div className="bg-background/70 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium">
            {seekIndicator.side === "left" ? "-10s" : "+10s"}
          </div>
        </div>
      )}

      {/* Fatal error overlay */}
      {hasFatal && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/80 backdrop-blur-sm px-6">
          <div className="text-center max-w-sm space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="text-lg font-semibold">Content not available right now</p>
            <p className="text-sm text-muted-foreground">
              {noMatch
                ? "We couldn't find this title in the streaming catalog."
                : "No playable sources were returned."}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setStreamError(false); refetchMatch(); refetchSources(); }}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleBack(); }}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/70 text-sm"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating fullscreen button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggleFullscreen(); flashControls(); }}
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center h-10 w-10 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/70 transition-opacity",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        <RotateCw className="h-5 w-5" />
      </button>

      {/* Controls overlay */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col transition-opacity duration-300 z-10",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <button
            onClick={(e) => { e.stopPropagation(); handleBack(); }}
            className="grid place-items-center h-10 w-10 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/70"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center min-w-0 px-4">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-sm font-medium truncate">{isMovie ? "Movie" : epLabel}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setSettingsOpen((v) => !v); }}
            className={cn(
              "grid place-items-center h-10 w-10 rounded-full backdrop-blur-md transition-colors",
              settingsOpen ? "bg-primary text-primary-foreground" : "bg-background/40 hover:bg-background/70",
            )}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Center playback */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={(e) => { e.stopPropagation(); seekBy(-10); }}
              className="grid place-items-center h-12 w-12 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/70"
              aria-label="Rewind 10 seconds"
            >
              <Rewind className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); cancelAutoNext(); }}
              className="grid place-items-center h-20 w-20 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-9 w-9 fill-current" /> : <Play className="h-9 w-9 fill-current ml-1" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); seekBy(10); }}
              className="grid place-items-center h-12 w-12 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/70"
              aria-label="Forward 10 seconds"
            >
              <FastForward className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Bottom: episode nav + progress */}
        <div data-controls className="p-4 pb-6 bg-gradient-to-t from-black/85 to-transparent">
          {!isMovie && (
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex-1 flex justify-start">
                {hasPrev ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); goToEpisode(-1); }}
                    className="inline-flex items-center gap-2 h-9 px-3 sm:px-4 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/70 text-xs sm:text-sm"
                  >
                    <SkipBack className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous Episode</span>
                    <span className="sm:hidden">Prev</span>
                  </button>
                ) : <span />}
              </div>
              <div className="flex-1 flex justify-end">
                {hasNext ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); goToEpisode(1); }}
                    className="inline-flex items-center gap-2 h-9 px-3 sm:px-4 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/70 text-xs sm:text-sm"
                  >
                    <span className="hidden sm:inline">Next Episode</span>
                    <span className="sm:hidden">Next</span>
                    <SkipForward className="h-4 w-4" />
                  </button>
                ) : <span />}
              </div>
            </div>
          )}

          {/* Progress */}
          <div
            className="group relative h-1.5 bg-foreground/20 rounded-full cursor-pointer"
            onClick={handleSeekClick}
          >
            <div className="absolute left-0 top-0 h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${pct}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{fmtTime(position)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const v = videoRef.current;
                if (!v) return;
                v.muted = !v.muted;
                setMuted(v.muted);
              }}
              className="grid place-items-center h-7 w-7 rounded-full hover:bg-white/10"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <>
          <div
            className="absolute inset-0 z-30"
            onClick={(e) => { e.stopPropagation(); setSettingsOpen(false); }}
          />
          <div
            data-settings
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute z-40 rounded-2xl bg-black/55 backdrop-blur-2xl border border-white/10 overflow-hidden shadow-xl",
              "left-3 right-3 bottom-24 sm:left-auto sm:right-4 sm:bottom-auto sm:top-16 sm:w-80",
            )}
          >
            {settingsView === "root" ? (
              <div className="py-2">
                <SettingsRootRow
                  icon={Sliders}
                  label="Quality"
                  value={sources.length === 0 ? "—" : qualityIdx === 0 ? `Auto (${sources[0]?.quality || "—"})` : sources[qualityIdx]?.quality || "—"}
                  onClick={() => setSettingsView("quality")}
                />
                <SettingsRootRow
                  icon={SubtitlesIcon}
                  label="Subtitles"
                  value={subtitleIdx < 0 ? "Off" : subtitles[subtitleIdx]?.lanName || subtitles[subtitleIdx]?.lan || "On"}
                  onClick={() => setSettingsView("subtitle")}
                />
                <SettingsRootRow
                  icon={Gauge}
                  label="Speed"
                  value={`${speed}x`}
                  onClick={() => setSettingsView("speed")}
                />
              </div>
            ) : (
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => setSettingsView("root")}
                  className="flex items-center gap-2 w-full px-4 h-12 text-sm text-muted-foreground hover:text-foreground border-b border-white/5"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="font-medium text-foreground">
                    {settingsView === "quality" && "Quality"}
                    {settingsView === "subtitle" && "Subtitles"}
                    {settingsView === "speed" && "Speed"}
                  </span>
                </button>
                <div className="py-1 max-h-[50vh] overflow-y-auto">
                  {settingsView === "quality" && sources.map((s, i) => (
                    <SettingsOptionRow
                      key={`${s.quality}-${i}`}
                      label={i === 0 ? `Auto (${s.quality})` : s.quality}
                      active={qualityIdx === i}
                      onClick={() => { setQualityIdx(i); setSettingsView("root"); }}
                    />
                  ))}
                  {settingsView === "quality" && sources.length === 0 && (
                    <p className="px-4 py-3 text-sm text-muted-foreground">No qualities available</p>
                  )}
                  {settingsView === "subtitle" && (
                    <>
                      <SettingsOptionRow
                        label="Off"
                        active={subtitleIdx < 0}
                        onClick={() => { setSubtitleIdx(-1); setSettingsView("root"); }}
                      />
                      {subtitles.map((s, i) => (
                        <SettingsOptionRow
                          key={`${s.lan}-${i}`}
                          label={s.lanName || s.lan}
                          active={subtitleIdx === i}
                          onClick={() => { setSubtitleIdx(i); setSettingsView("root"); }}
                        />
                      ))}
                      {subtitles.length === 0 && (
                        <p className="px-4 py-3 text-sm text-muted-foreground">No subtitles available</p>
                      )}
                    </>
                  )}
                  {settingsView === "speed" && SPEEDS.map((s) => (
                    <SettingsOptionRow
                      key={s}
                      label={`${s}x`}
                      active={speed === s}
                      onClick={() => { setSpeed(s); setSettingsView("root"); }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Auto-next overlay */}
      {autoNext != null && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl bg-background/40 backdrop-blur-xl border border-white/10 px-6 py-5 text-center min-w-[260px]">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Up next</p>
            <p className="text-2xl mt-1 font-semibold">Episode {episode + 1}</p>
            <p className="text-sm text-muted-foreground mt-1">Starting in {autoNext}…</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); cancelAutoNext(); }}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-background/60 hover:bg-background/80 text-sm"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); cancelAutoNext(); goToEpisode(1); }}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm"
              >
                <Play className="h-4 w-4 fill-current" /> Play now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsRootRow({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 w-full px-4 h-14 hover:bg-white/5 transition-colors text-left"
    >
      <Icon className="h-5 w-5 text-foreground/90 shrink-0" />
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <span className="text-sm text-muted-foreground truncate max-w-[40%]">{value}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function SettingsOptionRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full px-4 h-12 text-sm transition-colors",
        active ? "text-primary font-medium" : "text-foreground hover:bg-white/5",
      )}
    >
      <span>{label}</span>
      {active && <Check className="h-4 w-4" />}
    </button>
  );
}
