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
  Maximize,
  Minimize,
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
  Languages,
} from "lucide-react";
import { getMovieDetails, getSeasonDetails, getDisplayInfo } from "@/lib/tmdb";
import { useLibrary } from "@/lib/library";
import {
  findBestMatch,
  getGiftedSources,
  getGiftedSubject,
  findVariants,
  type GiftedSource,
  type GiftedSubtitle,
} from "@/services/giftedApi";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { srtUrlToVttBlobUrl } from "@/lib/subtitles";

type SettingsView = "root" | "quality" | "subtitle" | "speed" | "language";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateProgress } = useLibrary();
  const { user } = useAuth();

  const source = searchParams.get("source") || "tmdb";
  const contentType = (type as "movie" | "tv") || "movie";
  const numericId = Number(id);
  const season = Number(searchParams.get("season")) || 1;
  const episode = Number(searchParams.get("episode")) || 1;
  const variantId = searchParams.get("variant");

  // Metadata
  const { data: tmdbDetails } = useQuery({
    queryKey: ["player-detail", contentType, numericId],
    queryFn: () => getMovieDetails(numericId, contentType as "movie" | "tv"),
    enabled: source === "tmdb" && !!numericId,
  });

  const { data: giftedDetails } = useQuery({
    queryKey: ["player-gifted-detail", id],
    queryFn: () => getGiftedSubject(id!),
    enabled: source === "gifted" && !!id,
  });

  const { data: seasonData } = useQuery({
    queryKey: ["player-season", numericId, season],
    queryFn: () => getSeasonDetails(numericId, season),
    enabled: source === "tmdb" && contentType === "tv" && !!numericId,
  });

  const title = useMemo(() => {
    if (source === "tmdb") return tmdbDetails ? getDisplayInfo(tmdbDetails).title : "";
    return giftedDetails?.title || "";
  }, [source, tmdbDetails, giftedDetails]);

  const year = useMemo(() => {
    if (source === "tmdb") return tmdbDetails ? getDisplayInfo(tmdbDetails).year ?? null : null;
    return giftedDetails?.year ? Number(giftedDetails.year) : null;
  }, [source, tmdbDetails, giftedDetails]);

  const totalEpisodes = seasonData?.episodes?.length || 0;
  const isMovie = contentType === "movie";
  const hasNext = !isMovie && (totalEpisodes === 0 || episode < totalEpisodes);
  const hasPrev = !isMovie && episode > 1;

  // Resolved subjectId for Gifted
  const { data: matchedSubjectId, isLoading: matchingId, refetch: refetchMatch } = useQuery({
    queryKey: ["gifted-match", contentType, numericId, title, year],
    queryFn: () =>
      findBestMatch({
        title,
        year: year as number | null,
        type: contentType,
        externalId: numericId,
      }),
    enabled: source === "tmdb" && !!title,
    staleTime: 30 * 60 * 1000,
  });

  const subjectId = source === "gifted" ? id : (variantId || matchedSubjectId);

  // Variants
  const { data: variants } = useQuery({
    queryKey: ["gifted-variants", title],
    queryFn: () => findVariants(title),
    enabled: !!title,
  });

  const sourceSeason = isMovie ? undefined : season;
  const sourceEpisode = isMovie ? undefined : episode;

  // Sources
  const {
    data: sourcesData,
    isLoading: loadingSources,
    refetch: refetchSources,
    isError: sourcesError,
  } = useQuery({
    queryKey: ["gifted-sources", subjectId, sourceSeason, sourceEpisode],
    queryFn: () => getGiftedSources(subjectId!, sourceSeason, sourceEpisode),
    enabled: !!subjectId,
  });

  const sources: GiftedSource[] = useMemo(
    () =>
      [...(sourcesData?.results || [])].sort(
        (a, b) => qualityRank(b.quality) - qualityRank(a.quality),
      ),
    [sourcesData],
  );

  const subtitles: GiftedSubtitle[] = useMemo(
    () => sourcesData?.subtitles || [],
    [sourcesData],
  );

  const [vttUrls, setVttUrls] = useState<string[]>([]);
  useEffect(() => {
    if (!subtitles.length) {
      setVttUrls([]);
      return;
    }
    let cancelled = false;
    const created: string[] = [];

    const run = async () => {
      await new Promise<void>((res) => { window.setTimeout(res, 2000); });
      if (cancelled) return;

      const urls: string[] = [];
      for (const s of subtitles) {
        if (cancelled) break;
        const u = await srtUrlToVttBlobUrl(s.url);
        if (u.startsWith("blob:")) created.push(u);
        urls.push(u);
      }
      if (!cancelled) setVttUrls(urls);
    };

    run();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [subtitles]);

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
  const streamUrl = activeSource?.stream_url || "";

  // Player state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<number | null>(null);
  const persistTimer = useRef<number | null>(null);
  const wasPlayingRef = useRef(false);
  const initialResumeAppliedRef = useRef(false);
  const tryNextQualityRef = useRef<() => void>(() => {});
  const isSeekingRef = useRef(false);
  const loadIdRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [bufferLoading, setBufferLoading] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState(0);
  const [nextHighlighted, setNextHighlighted] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("root");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [autoNext, setAutoNext] = useState<number | null>(null);
  const autoNextTimer = useRef<number | null>(null);

  const resumeRef = useRef<number>(0);
  const resumeReadyRef = useRef<Promise<void>>(Promise.resolve());
  const resolveResumeRef = useRef<() => void>(() => {});

  // Load HLS / native MP4 source
  useEffect(() => {
    setStreamError(false);
    setBufferLoading(true);

    const video = videoRef.current;
    if (!video || !streamUrl) return;

    const currentLoadId = ++loadIdRef.current;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();

    const isM3u8 =
      /\.m3u8(\?|$)/i.test(streamUrl) ||
      /[?&]type=m3u8/i.test(streamUrl) ||
      /\/hls\//i.test(streamUrl);

    const handleReady = async () => {
      if (currentLoadId !== loadIdRef.current) return;
      setBufferLoading(false);
      await resumeReadyRef.current;
      if (currentLoadId !== loadIdRef.current) return;
      if (resumeRef.current > 0) {
        try { video.currentTime = resumeRef.current; } catch { /* noop */ }
        resumeRef.current = 0;
      }
      if (wasPlayingRef.current || !initialResumeAppliedRef.current) {
        video.play().catch(() => {});
        initialResumeAppliedRef.current = true;
      }
    };

    if (isM3u8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, handleReady);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (currentLoadId !== loadIdRef.current) return;
        if (data.fatal) {
          console.error("[Player] HLS fatal error", data);
          tryNextQualityRef.current();
        }
      });
    } else {
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", handleReady, { once: true });
      video.addEventListener("error", () => {
        if (currentLoadId !== loadIdRef.current) return;
        console.error("[Player] Native video error");
        tryNextQualityRef.current();
      }, { once: true });
    }
  }, [streamUrl]);

  tryNextQualityRef.current = () => {
    setQualityIdx((prev) => {
      if (prev + 1 < sourcesRef.current.length) return prev + 1;
      setStreamError(true);
      setBufferLoading(false);
      return prev;
    });
  };

  // Sync video state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      if (!isSeekingRef.current) setPosition(v.currentTime);
    };
    const onDur = () => setDuration(v.duration);
    const onWait = () => setBufferLoading(true);
    const onCanPlay = () => setBufferLoading(false);
    const onEnded = () => {
      if (hasNext) setAutoNext(10);
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("waiting", onWait);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("ended", onEnded);

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("waiting", onWait);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("ended", onEnded);
    };
  }, [hasNext]);

  // Initial resume fetch
  useEffect(() => {
    if (!user?.id || !numericId) return;
    resumeReadyRef.current = new Promise((res) => { resolveResumeRef.current = res; });
    const fetchResume = async () => {
      try {
        const { data } = await supabase
          .from("user_library")
          .select("last_position")
          .eq("user_id", user.id)
          .eq("tmdb_id", numericId)
          .eq("media_type", contentType)
          .eq("season_number", season)
          .eq("episode_number", episode)
          .maybeSingle();
        if (data?.last_position) resumeRef.current = data.last_position;
      } catch { /* noop */ }
      finally { resolveResumeRef.current(); }
    };
    fetchResume();
  }, [user?.id, numericId, contentType, season, episode]);

  // Persist progress
  const persistRef = useRef<() => void>(() => {});
  useEffect(() => {
    persistRef.current = () => {
      const v = videoRef.current;
      if (!v) return;
      const cur = v.currentTime;
      const dur = v.duration;
      if (!dur || !cur) return;
      const pct = Math.min(100, Math.round((cur / dur) * 100));
      
      const metadata = source === "tmdb" ? tmdbDetails : {
        id: giftedDetails?.subjectId,
        title: giftedDetails?.title,
        name: giftedDetails?.title,
        overview: giftedDetails?.overview,
        poster_path: giftedDetails?.imageUrl,
        backdrop_path: giftedDetails?.imageUrl,
        vote_average: giftedDetails?.rating,
        release_date: giftedDetails?.year ? `${giftedDetails.year}-01-01` : undefined,
        first_air_date: giftedDetails?.year ? `${giftedDetails.year}-01-01` : undefined,
        genres: (giftedDetails?.genres || []).map((g, i) => ({ id: i, name: g })),
      } as Record<string, unknown>;

      if (metadata) {
        const m = {
          id: metadata.id,
          title: metadata.title,
          name: metadata.name,
          overview: metadata.overview,
          poster_path: metadata.poster_path,
          backdrop_path: metadata.backdrop_path,
          vote_average: metadata.vote_average,
          release_date: metadata.release_date,
          first_air_date: metadata.first_air_date,
          genre_ids: (metadata.genres as Array<{id: number}>)?.map((g) => g.id) || [],
          media_type: contentType,
        } as Record<string, unknown>;
        updateProgress(m as any, contentType as "movie" | "tv", pct, season, episode, cur, dur);
      }
    };
  }, [tmdbDetails, giftedDetails, source, contentType, season, episode, updateProgress]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (persistTimer.current) window.clearInterval(persistTimer.current);
    persistTimer.current = window.setInterval(() => persistRef.current(), 5000);

    const onPause = () => persistRef.current();
    const onEnded = () => persistRef.current();
    const onUnload = () => persistRef.current();
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      if (persistTimer.current) window.clearInterval(persistTimer.current);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      window.removeEventListener("beforeunload", onUnload);
      persistRef.current();
    };
  }, []);

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
    const sourceParam = source === 'gifted' ? '&source=gifted' : '';
    const variantParam = variantId ? `&variant=${variantId}` : '';
    navigate(`/player/tv/${id}?season=${season}&episode=${next}${sourceParam}${variantParam}`, { replace: true });
  }, [episode, navigate, id, season, source, variantId, cancelAutoNext]);

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

  const handleSurfaceClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-controls]") || target.closest("[data-settings]")) return;
    setShowControls((p) => !p);
    flashControls();
  }, [flashControls]);

  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const computeSeekTime = (clientX: number) => {
    const rect = seekBarRef.current?.getBoundingClientRect();
    if (!rect || !duration) return 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };
  const onSeekPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!duration) return;
    const v = videoRef.current;
    wasPlayingRef.current = !!v && !v.paused;
    if (v && !v.paused) v.pause();
    isSeekingRef.current = true;
    setIsSeeking(true);
    setSeekPreview(computeSeekTime(e.clientX));
    e.currentTarget.setPointerCapture(e.pointerId);
    flashControls();
  };
  const onSeekPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeekingRef.current) return;
    setSeekPreview(computeSeekTime(e.clientX));
  };
  const endSeek = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeekingRef.current) return;
    const t = computeSeekTime(e.clientX);
    const v = videoRef.current;
    if (v) {
      try { v.currentTime = t; } catch { /* noop */ }
      setPosition(t);
      if (wasPlayingRef.current) v.play().catch(() => {});
    }
    isSeekingRef.current = false;
    setIsSeeking(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    flashControls();
  };

  const handleLanguageSwitch = (vId: string | number) => {
    const v = videoRef.current;
    const currentTime = v ? v.currentTime : 0;
    wasPlayingRef.current = v ? !v.paused : false;
    
    const next = new URLSearchParams(searchParams);
    if (vId === matchedSubjectId) {
      next.delete("variant");
    } else {
      next.set("variant", String(vId));
    }
    
    resumeRef.current = currentTime;
    initialResumeAppliedRef.current = false;
    setSearchParams(next, { replace: true });
    setSettingsOpen(false);
  };

  if (source === "tmdb" && !Number.isFinite(numericId)) {
    return <div className="p-8">Invalid content.</div>;
  }

  const displayTime = isSeeking ? seekPreview : position;
  const pct = duration ? (displayTime / duration) * 100 : 0;
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
      onClick={handleSurfaceClick}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain bg-black"
        playsInline
        preload="metadata"
      >
        {subtitles.map((s, i) => (
          <track
            key={`${s.lan}-${i}-${vttUrls[i] || s.url}`}
            kind="subtitles"
            src={vttUrls[i] || s.url}
            label={s.lanName || s.lan || "Subtitle"}
            srcLang={s.lan || "en"}
          />
        ))}
      </video>

      {/* Loading */}
      {(initialLoading || bufferLoading) && !hasFatal && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none z-10">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
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
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-muted text-foreground text-sm"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-next overlay */}
      {autoNext != null && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Next Episode In</p>
              <p className="text-7xl font-black text-primary tabular-nums">{autoNext}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); goToEpisode(1); }}
                className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
              >
                Play Now
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); cancelAutoNext(); }}
                className="h-12 px-8 rounded-full bg-white/10 text-white font-bold backdrop-blur active:scale-95 transition-transform"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        data-controls
        className={cn(
          "absolute inset-0 z-20 flex flex-col transition-opacity duration-500 bg-gradient-to-t from-black/80 via-transparent to-black/60",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Top Bar */}
        <div className="p-4 flex items-center gap-4">
          <button onClick={handleBack} className="p-2 -m-2 text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white truncate">{title}</h2>
            {epLabel && <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider">{epLabel}</p>}
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 -m-2 text-white/80 hover:text-white transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {/* Center Controls */}
        <div className="flex-1 flex items-center justify-center gap-8 md:gap-16">
          {!isMovie && (
            <button
              disabled={!hasPrev}
              onClick={(e) => { e.stopPropagation(); goToEpisode(-1); }}
              className="p-3 text-white/80 hover:text-white disabled:opacity-30 transition-all active:scale-90"
            >
              <SkipBack className="w-8 h-8 fill-current" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); seekBy(-10); }}
            className="p-3 text-white/80 hover:text-white transition-all active:scale-90"
          >
            <Rewind className="w-8 h-8 fill-current" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/20 active:scale-90 transition-transform"
          >
            {playing ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); seekBy(10); }}
            className="p-3 text-white/80 hover:text-white transition-all active:scale-90"
          >
            <FastForward className="w-8 h-8 fill-current" />
          </button>
          {!isMovie && (
            <button
              disabled={!hasNext}
              onClick={(e) => { e.stopPropagation(); goToEpisode(1); }}
              className="p-3 text-white/80 hover:text-white disabled:opacity-30 transition-all active:scale-90"
            >
              <SkipForward className="w-8 h-8 fill-current" />
            </button>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="p-4 md:p-8 space-y-4">
          {/* Seek Bar */}
          <div className="space-y-2">
            <div
              ref={seekBarRef}
              className="relative h-1.5 w-full bg-white/20 rounded-full cursor-pointer group"
              onPointerDown={onSeekPointerDown}
              onPointerMove={onSeekPointerMove}
              onPointerUp={endSeek}
              onPointerLeave={endSeek}
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full"
                style={{ width: `${pct}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform" />
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-white/60 tabular-nums">
              <span>{fmtTime(displayTime)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={(e) => { e.stopPropagation(); setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }}
                className="text-white/80 hover:text-white transition-colors"
              >
                {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  if (videoRef.current) {
                    videoRef.current.volume = v;
                    videoRef.current.muted = v === 0;
                  }
                }}
                className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                className="text-white/80 hover:text-white transition-colors"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Drawer */}
      {settingsOpen && (
        <div
          data-settings
          className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => { setSettingsOpen(false); setSettingsView("root"); }}
        >
          <div
            className="w-full max-w-md bg-card rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in slide-in-from-bottom-8 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settingsView !== "root" && (
                  <button onClick={() => setSettingsView("root")} className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <h3 className="font-bold text-sm">
                  {settingsView === "root" && "Settings"}
                  {settingsView === "quality" && "Video Quality"}
                  {settingsView === "subtitle" && "Subtitles"}
                  {settingsView === "speed" && "Playback Speed"}
                  {settingsView === "language" && "Language"}
                </h3>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="p-1 -mr-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {settingsView === "root" && (
                <div className="space-y-1">
                  <button
                    onClick={() => setSettingsView("quality")}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Sliders className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Quality</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{activeSource?.quality || "Auto"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                  <button
                    onClick={() => setSettingsView("subtitle")}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <SubtitlesIcon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Subtitles</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{subtitleIdx === -1 ? "Off" : subtitles[subtitleIdx]?.lanName || "On"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                  <button
                    onClick={() => setSettingsView("speed")}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Gauge className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Speed</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{speed}x</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                  {variants && variants.length > 1 && (
                    <button
                      onClick={() => setSettingsView("language")}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Languages className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Language</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{variants.find(v => v.id === subjectId)?.label || "Original"}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  )}
                </div>
              )}

              {settingsView === "quality" && (
                <div className="space-y-1">
                  {sources.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setQualityIdx(i); setSettingsOpen(false); }}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <span className={cn("text-sm font-medium", qualityIdx === i && "text-primary")}>{s.quality}</span>
                      {qualityIdx === i && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}

              {settingsView === "subtitle" && (
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setSubtitleIdx(-1);
                      if (videoRef.current) {
                        Array.from(videoRef.current.textTracks).forEach(t => t.mode = "disabled");
                      }
                      setSettingsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <span className={cn("text-sm font-medium", subtitleIdx === -1 && "text-primary")}>Off</span>
                    {subtitleIdx === -1 && <Check className="w-4 h-4 text-primary" />}
                  </button>
                  {subtitles.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSubtitleIdx(i);
                        if (videoRef.current) {
                          Array.from(videoRef.current.textTracks).forEach((t, idx) => t.mode = idx === i ? "showing" : "disabled");
                        }
                        setSettingsOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <span className={cn("text-sm font-medium", subtitleIdx === i && "text-primary")}>{s.lanName || s.lan}</span>
                      {subtitleIdx === i && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}

              {settingsView === "speed" && (
                <div className="space-y-1">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSpeed(s);
                        if (videoRef.current) videoRef.current.playbackRate = s;
                        setSettingsOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <span className={cn("text-sm font-medium", speed === s && "text-primary")}>{s}x</span>
                      {speed === s && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}

              {settingsView === "language" && variants && (
                <div className="space-y-1">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleLanguageSwitch(v.id)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <span className={cn("text-sm font-medium", subjectId === String(v.id) && "text-primary")}>{v.label}</span>
                      {subjectId === String(v.id) && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
