import { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface HlsPlayerProps {
  src: string;
  onError: () => void;
  onReady?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const HlsPlayer = ({ src, onError, onReady, isFullscreen, onToggleFullscreen }: HlsPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const tapCountRef = useRef(0);
  const lastTapXRef = useRef(0);
  const errorFiredRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [seekIndicator, setSeekIndicator] = useState<{ side: "left" | "right"; visible: boolean }>({
    side: "left",
    visible: false,
  });

  const fireError = useCallback(() => {
    if (!errorFiredRef.current) {
      errorFiredRef.current = true;
      onError();
    }
  }, [onError]);

  // Fetch Cinetaro API and extract stream URL
  useEffect(() => {
    errorFiredRef.current = false;
    setLoading(true);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const video = videoRef.current;
    if (!video || !src) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const abortController = new AbortController();

    const loadStream = async () => {
      try {
        if (import.meta.env.DEV) {
          console.log("[HlsPlayer] Fetching Cinetaro API:", src);
        }

        const res = await fetch(src, { signal: abortController.signal });
        if (!res.ok) throw new Error(`API returned ${res.status}`);

        const data = await res.json();
        const streamUrl: string | undefined =
          data?.sources?.[0]?.file || data?.stream || null;

        if (import.meta.env.DEV) {
          console.log("[HlsPlayer] Extracted stream URL:", streamUrl);
        }

        if (!streamUrl) {
          throw new Error("No stream URL found in API response");
        }

        // Use HLS.js if supported
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          });
          hlsRef.current = hls;

          hls.on(Hls.Events.ERROR, (_event, errorData) => {
            if (import.meta.env.DEV) {
              console.warn("[HlsPlayer] HLS error:", errorData);
            }
            if (errorData.fatal) {
              fireError();
            }
          });

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            video.play().catch(() => {});
            onReady?.();
          });

          hls.loadSource(streamUrl);
          hls.attachMedia(video);
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari native HLS
          video.src = streamUrl;
          video.addEventListener("loadedmetadata", () => {
            setLoading(false);
            video.play().catch(() => {});
            onReady?.();
          }, { once: true });
        } else {
          throw new Error("HLS not supported");
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        if (import.meta.env.DEV) {
          console.error("[HlsPlayer] Stream load error:", err);
        }
        setLoading(false);
        fireError();
      }
    };

    loadStream();

    return () => {
      abortController.abort();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, fireError, onReady]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onError = () => fireError();
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("error", onError);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("error", onError);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, [fireError]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      resetHideTimer();
    }
  }, [playing, resetHideTimer]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const seek = useCallback((offset: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + offset));
  }, []);

  const showSeekIndicator = useCallback((side: "left" | "right") => {
    setSeekIndicator({ side, visible: true });
    setTimeout(() => setSeekIndicator((prev) => ({ ...prev, visible: false })), 600);
  }, []);

  // Gesture handler
  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Ignore taps on controls bar
      const target = e.target as HTMLElement;
      if (target.closest("[data-controls]")) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
      const relX = (clientX - rect.left) / rect.width;

      tapCountRef.current += 1;
      lastTapXRef.current = relX;

      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

      tapTimerRef.current = setTimeout(() => {
        const count = tapCountRef.current;
        tapCountRef.current = 0;

        if (count >= 2) {
          // Double tap
          if (lastTapXRef.current < 0.4) {
            seek(-10);
            showSeekIndicator("left");
          } else if (lastTapXRef.current > 0.6) {
            seek(10);
            showSeekIndicator("right");
          }
        } else {
          // Single tap — toggle controls
          setShowControls((prev) => !prev);
          resetHideTimer();
        }
      }, 250);
    },
    [seek, showSeekIndicator, resetHideTimer]
  );

  const handleSeek = useCallback(
    (value: number[]) => {
      const video = videoRef.current;
      if (!video || !duration) return;
      video.currentTime = value[0];
    },
    [duration]
  );

  const handleVolumeChange = useCallback((value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const v = value[0];
    video.volume = v;
    setVolume(v);
    setMuted(v === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black select-none"
      onMouseMove={resetHideTimer}
      onClick={handleTap}
      onTouchEnd={handleTap}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}

      {/* Seek indicator */}
      {seekIndicator.visible && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none ${
            seekIndicator.side === "left" ? "left-8" : "right-8"
          }`}
        >
          <div className="bg-background/70 backdrop-blur-sm rounded-full px-4 py-2 text-foreground text-sm font-medium">
            {seekIndicator.side === "left" ? "-10s" : "+10s"}
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        data-controls
        className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* Gradient backdrop */}
        <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-3 px-3 space-y-2">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/80 w-10 text-right tabular-nums">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 1}
              step={0.5}
              onValueChange={handleSeek}
              className="flex-1 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-primary-foreground"
            />
            <span className="text-xs text-white/80 w-10 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>

          {/* Control buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={togglePlay}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors"
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button
              onClick={() => seek(-10)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => seek(10)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume */}
            <button
              onClick={toggleMute}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors ml-1"
            >
              {muted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <div className="w-20 hidden sm:block">
              <Slider
                value={[muted ? 0 : volume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={handleVolumeChange}
                className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
              />
            </div>

            <div className="flex-1" />

            {/* Fullscreen */}
            <button
              onClick={onToggleFullscreen}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HlsPlayer;
