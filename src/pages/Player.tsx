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
} from "lucide-react";
import { getMovieDetails, getSeasonDetails, getDisplayInfo } from "@/lib/tmdb";
import { useLibrary } from "@/lib/library";
import {
  findBestMatch,
  getGiftedSources,
  getGiftedInfo,
  type GiftedSource,
  type GiftedSubtitle,
} from "@/services/giftedApi";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { srtUrlToVttBlobUrl } from "@/lib/subtitles";
import { isGiftedId } from "@/lib/slug";
import { usePlayerPrefs, cueScale } from "@/hooks/usePlayerPrefs";

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

  // Anime now plays through the TV pipeline. Legacy /player/anime/* routes
  // are redirected by App.tsx.
  const contentType = (type as "movie" | "tv") || "movie";
  const isGiftedSource = searchParams.get("source") === "gifted" || isGiftedId(id);
  const numericId = Number(id);
  const season = Number(searchParams.get("season")) || 1;
  const episode = Number(searchParams.get("episode")) || 1;

  // Metadata (only for TMDB-sourced content; gifted has its own info endpoint)
  const { data: tmdbDetails } = useQuery({
    queryKey: ["player-detail", contentType, numericId],
    queryFn: () => getMovieDetails(numericId, contentType as "movie" | "tv"),
    enabled: !isGiftedSource && !!numericId && Number.isFinite(numericId),
  });
  const { data: seasonData } = useQuery({
    queryKey: ["player-season", numericId, season],
    queryFn: () => getSeasonDetails(numericId, season),
    enabled: !isGiftedSource && contentType === "tv" && !!numericId && Number.isFinite(numericId),
  });

  // Fetch Gifted info for title display when playing a Gifted source directly
  const { data: giftedInfo } = useQuery({
    queryKey: ["player-gifted-info", id],
    queryFn: () => getGiftedInfo(id!),
    enabled: isGiftedSource && !!id,
    staleTime: 30 * 60 * 1000,
  });

  const title = isGiftedSource
    ? (giftedInfo?.title || "")
    : (tmdbDetails ? getDisplayInfo(tmdbDetails as any).title : "");
  const year = isGiftedSource
    ? (giftedInfo?.year ?? null)
    : (tmdbDetails ? getDisplayInfo(tmdbDetails as any).year ?? null : null);

  const totalEpisodes = seasonData?.episodes?.length || 0;
  const isMovie = contentType === "movie";
  const hasNext = !isMovie && (totalEpisodes === 0 || episode < totalEpisodes);
  const hasPrev = !isMovie && episode > 1;

  // Resolved subjectId for Gifted.
  // If `source=gifted` was passed (DetailsPage routed from a Gifted card),
  // skip the TMDB → Gifted matching round trip and use the URL id directly.
  const matchEnabled = !isGiftedSource && !!title;
  const { data: matchedId, isLoading: matchingId, refetch: refetchMatch } = useQuery({
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
  const subjectId: string | number | null | undefined = isGiftedSource ? id : matchedId;

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

  // FIX 1: Memoize subtitles so its reference only changes when sourcesData
  // changes. Without this, a new array is created on every render, causing the
  // blob-URL effect and the auto-select effect to re-run in an infinite loop
  // which freezes the app on navigation.
  const subtitles: GiftedSubtitle[] = useMemo(
    () => sourcesData?.subtitles || [],
    [sourcesData],
  );

  // Convert SRT subtitle URLs to WebVTT blob URLs (browser only renders VTT in <track>).
  // PERF: Deferred by 2 s after subtitles arrive so the conversion network
  // requests don't compete with HLS init + manifest fetch on mount, which was
  // causing the visible UI freeze when navigating to the player.
  // Conversions are also staggered (sequential, not Promise.all) so they don't
  // all hit the network simultaneously on low-end devices.
  const [vttUrls, setVttUrls] = useState<string[]>([]);
  useEffect(() => {
    if (!subtitles.length) {
      setVttUrls([]);
      return;
    }
    let cancelled = false;
    const created: string[] = [];

    const run = async () => {
      // Wait for the stream to get a head-start before kicking off subtitle fetches.
      await new Promise<void>((res) => { window.setTimeout(res, 2000); });
      if (cancelled) return;

      // Convert one at a time so we don't saturate the network on mount.
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

  // Keep a ref to sources so tryNextQuality always reads the current
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
  const persistTimer = useRef<number | null>(null);
  const wasPlayingRef = useRef(false);
  const initialResumeAppliedRef = useRef(false);
  const tryNextQualityRef = useRef<() => void>(() => {});
  const isSeekingRef = useRef(false);

  // Track whether the current streamUrl load is still valid.
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
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState(0);
  const [nextHighlighted, setNextHighlighted] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("root");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-next overlay
  const [autoNext, setAutoNext] = useState<number | null>(null);
  const autoNextTimer = useRef<number | null>(null);

  // Resume position to apply on next loadedmetadata.
  const resumeRef = useRef<number>(0);
  // Resolves when the Supabase resume fetch completes (hit or miss).
  // handleReady awaits this so it never races a slow DB response and
  // misses the saved timestamp — the root cause of resume starting at 0.
  const resumeReadyRef = useRef<Promise<void>>(Promise.resolve());
  const resolveResumeRef = useRef<() => void>(() => {});

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

    // Only treat as HLS if the *path* portion ends with .m3u8 or /hls/.
    // Gifted proxy URLs look like /stream?url=...  — the inner url= param may
    // reference an mp4 or even contain the word "m3u8", so we check only the
    // pathname before the first "?".
    const streamPath = streamUrl.split("?")[0];
    const isM3u8 =
      /\.m3u8$/i.test(streamPath) ||
      /\/hls\//i.test(streamPath);

    const handleReady = async () => {
      // Ignore if this callback belongs to a superseded load.
      if (currentLoadId !== loadIdRef.current) return;
      setBufferLoading(false);
      // Wait for the Supabase resume fetch to finish before seeking.
      // Without this await the seek happens before resumeRef is populated
      // on slower connections, causing playback to always start at 0.
      await resumeReadyRef.current;
      if (currentLoadId !== loadIdRef.current) return; // re-check after await
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

  // FIX 2: tryNextQuality no longer closes over qualityIdx from the render
  // that created it. Instead it reads the latest index via a functional
  // setState updater, so rapid async HLS error callbacks can't use a stale
  // index to silently skip past all qualities and hit the error overlay.
  const tryNextQuality = useCallback(() => {
    setQualityIdx((prev) => {
      if (prev + 1 < sourcesRef.current.length) {
        console.warn("[Player] Stream failed, trying next quality");
        return prev + 1;
      }
      console.error("[Player] All qualities exhausted");
      setStreamError(true);
      setBufferLoading(false);
      return prev;
    });
  }, []); // no deps — reads live values via ref and functional updater

  // Video event listeners
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      if (isSeekingRef.current) return;
      setPosition(v.currentTime);
    };
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
  }, [subtitleIdx, vttUrls.length]);

  const { prefs } = usePlayerPrefs();

  // Auto-enable preferred subtitle language on first load if available.
  const subAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (subAutoSelectedRef.current) return;
    if (!subtitles.length || !vttUrls.length) return;
    const wanted = (prefs.subtitleLang || "English").slice(0, 2).toLowerCase();
    const map: Record<string, RegExp> = {
      en: /^en/i, es: /^(es|spa)/i, fr: /^(fr|fra)/i, de: /^(de|ger|deu)/i,
      it: /^it/i, pt: /^(pt|por)/i, ja: /^(ja|jap|jpn)/i, ko: /^(ko|kor)/i,
      zh: /^(zh|chi|cmn)/i, hi: /^(hi|hin)/i, ar: /^(ar|ara)/i, ru: /^(ru|rus)/i, tu: /^(tr|tur)/i,
    };
    const re = map[wanted] ?? new RegExp(`^${wanted}`, "i");
    let idx = subtitles.findIndex((s) => re.test(s.lan || ""));
    if (idx < 0) idx = subtitles.findIndex((s) => /^en/i.test(s.lan || ""));
    if (idx >= 0) setSubtitleIdx(idx);
    subAutoSelectedRef.current = true;
  }, [subtitles, vttUrls, prefs.subtitleLang]);

  // Auto-pick preferred quality once sources resolve.
  const qualityAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (qualityAutoSelectedRef.current) return;
    if (!sources.length) return;
    const target = (prefs.quality || "Auto");
    if (target !== "Auto") {
      const targetN = parseInt(target, 10);
      // Find the highest quality <= target.
      let bestIdx = -1;
      for (let i = 0; i < sources.length; i++) {
        const n = qualityRank(sources[i].quality);
        if (n <= targetN) { bestIdx = i; break; } // sources are sorted desc
      }
      if (bestIdx > 0) setQualityIdx(bestIdx);
    }
    qualityAutoSelectedRef.current = true;
  }, [sources, prefs.quality]);

  // Reset quality auto-pick when content changes.
  useEffect(() => {
    qualityAutoSelectedRef.current = false;
  }, [subjectId, sourceEpisode]);

  // Apply subtitle size via CSS variable on the player container.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root.style.setProperty("--cue-scale", String(cueScale(prefs.subtitleSize)));
  }, [prefs.subtitleSize]);

  // Reset subtitle auto-pick + next-episode highlight when episode/source changes.
  useEffect(() => {
    subAutoSelectedRef.current = false;
    setNextHighlighted(false);
  }, [subjectId, sourceEpisode]);

  // 80% next-episode highlight trigger.
  useEffect(() => {
    if (nextHighlighted || !hasNext || !duration) return;
    if (position / duration >= 0.8) setNextHighlighted(true);
  }, [position, duration, hasNext, nextHighlighted]);

  // Seed resume position from cloud on first load.
  // We also create a promise here that resolveResumeRef resolves when the
  // fetch completes — handleReady awaits it to avoid the race condition.
  useEffect(() => {
    resumeRef.current = 0;
    // Create a fresh promise for this load. handleReady will await it.
    resumeReadyRef.current = new Promise<void>((resolve) => {
      resolveResumeRef.current = resolve;
    });

    if (!user?.id || !numericId) {
      resolveResumeRef.current(); // nothing to fetch, unblock immediately
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("continue_watching")
          .select("current_time_sec, season, episode")
          .eq("user_id", user.id)
          .eq("content_id", String(numericId))
          .eq("content_type", contentType)
          .maybeSingle();

        if (!cancelled && data) {
          // For movies, Supabase may store season/episode as null OR as 1/1
          // depending on how updateProgress was called. Accept both.
          const seasonMatch = isMovie
            ? (data.season == null || data.season === 1)
            : (data.season ?? null) === season;
          const episodeMatch = isMovie
            ? (data.episode == null || data.episode === 1)
            : (data.episode ?? null) === episode;

          if (seasonMatch && episodeMatch && data.current_time_sec > 5) {
            resumeRef.current = data.current_time_sec;
          }
        }
      } finally {
        // Always resolve — even on error — so handleReady is never blocked.
        if (!cancelled) resolveResumeRef.current();
      }
    })();

    return () => {
      cancelled = true;
      resolveResumeRef.current(); // unblock handleReady on cleanup
    };
  }, [user?.id, numericId, contentType, season, episode, isMovie]);

  // Persist progress: every 5s, on pause, on ended, on unmount/unload.
  const persistRef = useRef<() => void>(() => {});
  useEffect(() => {
    persistRef.current = () => {
      const v = videoRef.current;
      if (!v) return;
      const cur = v.currentTime;
      const dur = v.duration;
      if (!dur || !cur) return;
      const pct = Math.min(100, Math.round((cur / dur) * 100));
      if (tmdbDetails) {
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
        updateProgress(m, contentType as "movie" | "tv", pct, season, episode, cur, dur);
      }
    };
  }, [tmdbDetails, contentType, season, episode, updateProgress]);

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
    // Use the raw string `id` for gifted sources to avoid large-integer precision loss
    // when the subjectId is cast to a JS Number (> 2^53 loses digits).
    const navId = isGiftedSource ? id : numericId;
    const sourceQs = isGiftedSource ? "&source=gifted" : "";
    navigate(`/player/tv/${navId}?season=${season}&episode=${next}${sourceQs}`, { replace: true });
  }, [episode, navigate, id, numericId, season, cancelAutoNext, isGiftedSource]);

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

  // Click on the player surface only toggles controls visibility (no gestures).
  const handleSurfaceClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-controls]") || target.closest("[data-settings]")) return;
    setShowControls((p) => !p);
    flashControls();
  }, [flashControls]);

  // Draggable seek bar (Pointer Events: mouse + touch + pen).
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

  if (!isGiftedSource && !Number.isFinite(numericId)) {
    return <div className="p-8">Invalid content.</div>;
  }

  const displayTime = isSeeking ? seekPreview : position;
  const pct = duration ? (displayTime / duration) * 100 : 0;
  const initialLoading = (matchEnabled && matchingId) || loadingSources;
  const noMatch = matchEnabled && !matchingId && !subjectId && !!title;
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
      {/*
        Removed crossOrigin="anonymous". The Gifted API returns a proxy
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
        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
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
                    className={cn(
                      "inline-flex items-center gap-2 h-9 px-3 sm:px-4 rounded-full backdrop-blur-md text-xs sm:text-sm transition-all",
                      nextHighlighted
                        ? "bg-primary text-primary-foreground scale-105 shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
                        : "bg-background/40 hover:bg-background/70",
                    )}
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
            ref={seekBarRef}
            className="group relative h-3 flex items-center cursor-pointer touch-none"
            onPointerDown={onSeekPointerDown}
            onPointerMove={onSeekPointerMove}
            onPointerUp={endSeek}
            onPointerCancel={endSeek}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-1.5 w-full bg-foreground/20 rounded-full">
              <div className="absolute left-0 top-0 h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
              <div
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-primary transition-opacity",
                  isSeeking ? "opacity-100 scale-110" : "opacity-0 group-hover:opacity-100",
                )}
                style={{ left: `${pct}%` }}
              />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{fmtTime(displayTime)}</span>
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
