import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FastForward,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RefreshCw,
  Rewind,
  Settings,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { getInfo, getSeason, getStream, type MovieBoxStream, type SubjectKind } from "@/services/moviebox";
import { getLocalResume, useLibrary } from "@/lib/library";
import { pickResolution, usePlayerPrefs } from "@/hooks/usePlayerPrefs";
import { cn } from "@/lib/utils";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function fmtTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Player() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateProgress } = useLibrary();

  const kind = (type as SubjectKind) || "movie";
  const isMovie = kind === "movie";
  const se = isMovie ? 0 : Number(searchParams.get("se")) || 1;
  const ep = isMovie ? 0 : Number(searchParams.get("ep")) || 1;
  const { prefs } = usePlayerPrefs();


  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedRes, setSelectedRes] = useState<number | null>(null);

  const { data: info } = useQuery({
    queryKey: ["mb-info", id],
    queryFn: () => getInfo(id!),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });

  const { data: seasonData } = useQuery({
    queryKey: ["mb-season", id],
    queryFn: () => getSeason(id!),
    enabled: !!id && !isMovie,
    staleTime: 30 * 60 * 1000,
  });

  const {
    data: streamData,
    isLoading: loadingStreams,
    isError: streamError,
    refetch: refetchStreams,
  } = useQuery({
    queryKey: ["mb-stream", id, se, ep],
    queryFn: () => getStream(id!, se, ep),
    enabled: !!id,
    // signed URLs expire — never keep them around
    gcTime: 0,
    staleTime: 0,
  });

  const streams: MovieBoxStream[] = useMemo(
    () => [...(streamData?.streams ?? [])].sort((a, b) => b.resolution - a.resolution),
    [streamData],
  );

  const activeStream = useMemo(() => {
    if (!streams.length) return undefined;
    if (selectedRes) {
      const picked = streams.find((s) => s.resolution === selectedRes);
      if (picked) return picked;
    }
    const preferred = pickResolution(streams.map((s) => s.resolution), prefs.quality);
    return streams.find((s) => s.resolution === preferred) ?? streams[0];
  }, [streams, selectedRes, prefs.quality]);

  const seasons = seasonData?.seasons ?? [];
  const currentSeason = seasons.find((s) => s.season === se);
  const episodeCount = currentSeason?.episodesAvailable || currentSeason?.totalEpisode || 0;
  const hasNext = !isMovie && (episodeCount === 0 || ep < episodeCount || seasons.some((s) => s.season === se + 1));
  const hasPrev = !isMovie && (ep > 1 || se > 1);

  const goEpisode = (nextSe: number, nextEp: number) => {
    navigate(`/player/${kind}/${id}?se=${nextSe}&ep=${nextEp}`, { replace: true });
  };

  const next = () => {
    if (episodeCount && ep >= episodeCount) goEpisode(se + 1, 1);
    else goEpisode(se, ep + 1);
  };

  const prev = () => {
    if (ep > 1) goEpisode(se, ep - 1);
    else if (se > 1) {
      const prevSeason = seasons.find((s) => s.season === se - 1);
      goEpisode(se - 1, prevSeason?.episodesAvailable || 1);
    }
  };

  /* ── Source loading ─────────────────────────────────────────────────── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !activeStream) return;
    const resume = getLocalResume(id!, se, ep);
    v.src = activeStream.url;
    v.load();
    const onMeta = () => {
      if (resume > 5 && resume < v.duration - 10) v.currentTime = resume;
      v.playbackRate = speed;
      v.play().catch(() => undefined);
    };
    v.addEventListener("loadedmetadata", onMeta, { once: true });
    return () => v.removeEventListener("loadedmetadata", onMeta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStream?.url, id, se, ep]);

  /* ── Progress persistence ───────────────────────────────────────────── */
  const persist = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration || !info) return;
    const pct = Math.min(100, (v.currentTime / v.duration) * 100);
    updateProgress(
      {
        subjectId: id!,
        title: info.title,
        poster: info.poster,
        type: kind,
      },
      pct,
      se,
      ep,
      v.currentTime,
    );
  }, [info, id, kind, se, ep, updateProgress]);

  useEffect(() => {
    const t = window.setInterval(persist, 10000);
    return () => {
      window.clearInterval(t);
      persist();
    };
  }, [persist]);

  /* ── Controls auto-hide ─────────────────────────────────────────────── */
  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), 3500);
  }, []);

  useEffect(() => {
    bumpControls();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [bumpControls]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
    bumpControls();
  };

  const seekBy = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
    bumpControls();
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await shellRef.current?.requestFullscreen?.().catch(() => undefined);
    else await document.exitFullscreen().catch(() => undefined);
  };

  const title = info?.title ?? "";
  const subtitle = isMovie ? "" : `S${se} · E${ep}`;

  return (
    <div ref={shellRef} className="fixed inset-0 z-50 bg-black" onMouseMove={bumpControls}>
      <video
        ref={videoRef}
        className="h-full w-full bg-black object-contain"
        playsInline
        onClick={() => (showControls ? togglePlay() : bumpControls())}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => {
          persist();
          if (hasNext) next();
        }}
      />

      {(loadingStreams || buffering) && !streamError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" />
        </div>
      )}

      {streamError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-white/80">Couldn’t load this stream.</p>
          <button
            onClick={() => refetchStreams()}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/70 via-transparent to-black/80 transition-opacity duration-300",
          showControls ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{title}</p>
            {subtitle && <p className="text-xs text-white/60">{subtitle}</p>}
          </div>
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-8">
          <button onClick={() => seekBy(-10)} className="text-white" aria-label="Rewind 10 seconds">
            <Rewind className="h-8 w-8" />
          </button>
          <button
            onClick={togglePlay}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current" />}
          </button>
          <button onClick={() => seekBy(10)} className="text-white" aria-label="Forward 10 seconds">
            <FastForward className="h-8 w-8" />
          </button>
        </div>

        <div className="space-y-2 p-4">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={(e) => {
              const v = videoRef.current;
              if (v) v.currentTime = Number(e.target.value);
              setCurrent(Number(e.target.value));
              bumpControls();
            }}
            aria-label="Seek"
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-primary"
          />
          <div className="flex items-center gap-3 text-xs text-white/80">
            <span>{fmtTime(current)}</span>
            <span className="ml-auto">{fmtTime(duration)}</span>
          </div>
          <div className="flex items-center gap-4 text-white">
            <button
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                v.muted = !v.muted;
                setMuted(v.muted);
              }}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            {!isMovie && (
              <>
                <button onClick={prev} disabled={!hasPrev} className="disabled:opacity-30" aria-label="Previous episode">
                  <SkipBack className="h-5 w-5" />
                </button>
                <button onClick={next} disabled={!hasNext} className="disabled:opacity-30" aria-label="Next episode">
                  <SkipForward className="h-5 w-5" />
                </button>
              </>
            )}
            <span className="ml-auto text-xs text-white/70">{activeStream?.quality ?? ""}</span>
            <button onClick={toggleFullscreen} aria-label="Toggle fullscreen">
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Settings sheet */}
      {settingsOpen && (
        <div className="absolute inset-0 z-10 flex items-end bg-black/60" onClick={() => setSettingsOpen(false)}>
          <div
            className="max-h-[70vh] w-full space-y-5 overflow-y-auto rounded-t-2xl bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Playback settings</p>
              <button onClick={() => setSettingsOpen(false)} aria-label="Close">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quality</p>
              {streams.map((s) => (
                <button
                  key={s.resolution}
                  onClick={() => {
                    setSelectedRes(s.resolution);
                    setSettingsOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted"
                >
                  <span>
                    {s.quality} <span className="text-xs text-muted-foreground">· {s.size}</span>
                  </span>
                  {activeStream?.resolution === s.resolution && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Speed</p>
              <div className="flex flex-wrap gap-2">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSpeed(s);
                      if (videoRef.current) videoRef.current.playbackRate = s;
                    }}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium",
                      speed === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
