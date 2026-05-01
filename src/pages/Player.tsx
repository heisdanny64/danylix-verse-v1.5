import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
  Languages,
  Gauge,
} from 'lucide-react';
import { useMediaDetail } from '@/lib/anilist/hooks';
import { useContinueWatching } from '@/lib/store';
import { LazyImage } from '@/components/LazyImage';
import { preferredTitle, mediaPath } from '@/lib/format';
import { cn } from '@/lib/utils';

const MOCK_DURATION = 24 * 60; // 24 minutes simulated

type Source = 'home' | 'details';

const QUALITIES = ['Auto', '1080p', '720p', '480p', '360p'] as const;
const SUBTITLES = ['English', 'Japanese'] as const;
const AUDIOS = ['English', 'Japanese'] as const;
const SPEEDS = [0.25, 0.5, 1.0, 1.5, 2.0] as const;

type SettingsView = 'root' | 'quality' | 'subtitle' | 'audio' | 'speed';

export default function Player() {
  const { id, ep } = useParams();
  const mediaId = Number(id);
  const episode = Math.max(1, Number(ep) || 1);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: m, isLoading } = useMediaDetail(mediaId);
  const cw = useContinueWatching();

  // Track entry source (persist across episode reloads via sessionStorage)
  const sourceKey = `torii:player-source:${mediaId}`;
  const initialSource: Source = useMemo(() => {
    const fromState = (location.state as { source?: Source } | null)?.source;
    if (fromState) {
      try { sessionStorage.setItem(sourceKey, fromState); } catch { /* noop */ }
      return fromState;
    }
    try {
      const saved = sessionStorage.getItem(sourceKey) as Source | null;
      if (saved === 'details' || saved === 'home') return saved;
    } catch { /* noop */ }
    return 'home';
  }, [location.state, sourceKey]);
  const [source] = useState<Source>(initialSource);

  // Determine if this navigation should skip resume logic.
  // `fresh: true` is set by player-internal nav (auto-next, play-now, prev/next buttons).
  // External entries (Hero, ContinueWatching, Details) omit it and resume normally.
  const isFreshNav = !!(location.state as { fresh?: boolean } | null)?.fresh;

  const computeInitialPosition = () => {
    if (isFreshNav) return 0;
    const s = cw.get(mediaId);
    const pos = s && s.episode === episode ? s.positionSec : 0;
    // Safety: if saved position is past the end, restart
    if (pos > MOCK_DURATION - 5) return 0;
    return pos;
  };

  const [position, setPosition] = useState<number>(computeInitialPosition);
  const [playing, setPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Settings menu state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('root');
  const [quality, setQuality] = useState<typeof QUALITIES[number]>('Auto');
  const [subtitle, setSubtitle] = useState<typeof SUBTITLES[number]>('English');
  const [audio, setAudio] = useState<typeof AUDIOS[number]>('English');
  const [speed, setSpeed] = useState<number>(1.0);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-next overlay
  const [autoNext, setAutoNext] = useState<number | null>(null);
  const autoNextTimer = useRef<number | null>(null);

  // Skip persistence for one tick on fresh nav so stale state can't be written
  const persistReadyRef = useRef<boolean>(!isFreshNav);

  const isMovie = !!m && (m.format === 'MOVIE' || m.episodes === 1);
  const totalEp = m?.episodes ?? null;
  const hasNext = !isMovie && (totalEp == null || episode < totalEp);
  const hasPrev = !isMovie && episode > 1;
  const nearEnd = position / MOCK_DURATION >= 0.8;

  // On episode/media change: reset position & consume `fresh` flag from history state
  useEffect(() => {
    setPosition(computeInitialPosition());
    setPlaying(true);
    persistReadyRef.current = false;
    // Allow persistence after first tick
    const ready = window.setTimeout(() => { persistReadyRef.current = true; }, 250);
    // Strip `fresh` from history state so an in-tab refresh resumes normally
    if (isFreshNav) {
      navigate(location.pathname, { replace: true, state: { source } });
    }
    return () => window.clearTimeout(ready);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaId, episode]);

  // Auto-progress (speed-aware)
  useEffect(() => {
    if (!playing) return;
    const interval = Math.max(50, Math.round(1000 / speed));
    const t = window.setInterval(() => {
      setPosition((p) => Math.min(MOCK_DURATION, p + 1));
    }, interval);
    return () => window.clearInterval(t);
  }, [playing, speed]);

  // Persist progress every 3s
  useEffect(() => {
    if (!m) return;
    const t = window.setInterval(() => {
      if (!persistReadyRef.current) return;
      cw.upsert({
        id: m.id,
        title: preferredTitle(m.title),
        cover: m.bannerImage || m.coverImage.large || m.coverImage.medium || null,
        episode,
        totalEpisodes: m.episodes ?? null,
        positionSec: position,
        durationSec: MOCK_DURATION,
      });
    }, 3000);
    return () => window.clearInterval(t);
  }, [m, episode, position, cw]);

  // Save once on unmount
  useEffect(() => {
    return () => {
      if (!m) return;
      if (!persistReadyRef.current) return;
      cw.upsert({
        id: m.id,
        title: preferredTitle(m.title),
        cover: m.bannerImage || m.coverImage.large || m.coverImage.medium || null,
        episode,
        totalEpisodes: m.episodes ?? null,
        positionSec: position,
        durationSec: MOCK_DURATION,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Cancel any auto-next timer when episode changes or unmounting
  useEffect(() => {
    return () => {
      if (autoNextTimer.current) {
        window.clearTimeout(autoNextTimer.current);
        autoNextTimer.current = null;
      }
    };
  }, [mediaId, episode]);

  // Auto-next trigger when episode finishes
  useEffect(() => {
    if (position < MOCK_DURATION) return;
    if (!hasNext) {
      setPlaying(false);
      return;
    }
    if (autoNextTimer.current) return;
    setPlaying(false);
    setAutoNext(5);
    const tick = () => {
      setAutoNext((n) => {
        if (n == null) return null;
        if (n <= 1) {
          autoNextTimer.current = null;
          navigate(`/watch/${mediaId}/${episode + 1}`, { state: { source, fresh: true } });
          return null;
        }
        autoNextTimer.current = window.setTimeout(tick, 1000);
        return n - 1;
      });
    };
    autoNextTimer.current = window.setTimeout(tick, 1000);
    return () => {
      if (autoNextTimer.current) {
        window.clearTimeout(autoNextTimer.current);
        autoNextTimer.current = null;
      }
    };
  }, [position, hasNext, mediaId, episode, navigate, source]);

  const cancelAutoNext = useCallback(() => {
    if (autoNextTimer.current) {
      window.clearTimeout(autoNextTimer.current);
      autoNextTimer.current = null;
    }
    setAutoNext(null);
  }, []);

  const flashControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => { flashControls(); }, [flashControls]);

  // Esc closes settings
  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        setSettingsView('root');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen]);

  // Reset settings view whenever menu reopens
  useEffect(() => {
    if (settingsOpen) setSettingsView('root');
  }, [settingsOpen]);

  const handleBack = useCallback(() => {
    if (source === 'details' && m) {
      navigate(mediaPath({ id: m.id, type: m.type, title: m.title }), { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [source, m, navigate]);

  const goToEpisode = (delta: 1 | -1) => {
    cancelAutoNext();
    navigate(`/watch/${mediaId}/${episode + delta}`, { state: { source, fresh: true } });
  };

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        try {
          // @ts-ignore - orientation.lock not in all TS lib targets
          await screen.orientation?.lock?.('landscape');
        } catch { /* unsupported (e.g. iOS) */ }
      } else {
        try { screen.orientation?.unlock?.(); } catch { /* noop */ }
        await document.exitFullscreen();
      }
    } catch { /* noop */ }
  }, []);

  if (!Number.isFinite(mediaId)) return <div className="p-8">Invalid episode.</div>;

  const title = m ? preferredTitle(m.title) : '';
  const epData = m?.streamingEpisodes?.[episode - 1];
  const epTitle = epData?.title || `Episode ${episode}`;
  const pct = (position / MOCK_DURATION) * 100;

  function fmtTime(sec: number) {
    const mm = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mm}:${String(s).padStart(2, '0')}`;
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setPosition(Math.max(0, Math.min(MOCK_DURATION, ratio * MOCK_DURATION)));
    flashControls();
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black text-foreground select-none"
      onMouseMove={flashControls}
      onClick={flashControls}
    >
      {/* Background poster (fake video frame) */}
      {m && (
        <div className="absolute inset-0 opacity-50">
          <LazyImage
            src={epData?.thumbnail || m.bannerImage || m.coverImage.extraLarge || m.coverImage.large}
            alt={title}
            containerClassName="absolute inset-0"
            className={cn('animate-zoom-slow', !playing && 'opacity-70')}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 grid place-items-center text-muted-foreground">Loading…</div>
      )}

      {/* Floating rotate / fullscreen button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggleFullscreen(); flashControls(); }}
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center h-10 w-10 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/70 transition-opacity',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        <RotateCw className="h-5 w-5" />
      </button>

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute inset-0 flex flex-col transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent safe-top">
          <button
            onClick={(e) => { e.stopPropagation(); handleBack(); }}
            className="grid place-items-center h-10 w-10 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/70"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center min-w-0 px-4">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-sm font-medium truncate">
              {isMovie ? 'Movie' : `Ep ${episode} · ${epTitle}`}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setSettingsOpen((v) => !v); }}
            className={cn(
              'grid place-items-center h-10 w-10 rounded-full backdrop-blur-md transition-colors',
              settingsOpen ? 'bg-primary text-primary-foreground' : 'bg-background/40 hover:bg-background/70'
            )}
            aria-label="Settings"
            aria-expanded={settingsOpen}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Center playback row */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={(e) => { e.stopPropagation(); setPosition((p) => Math.max(0, p - 10)); }}
              className="grid place-items-center h-12 w-12 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/70"
              aria-label="Rewind 10 seconds"
            >
              <Rewind className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setPlaying((p) => !p); cancelAutoNext(); }}
              className="grid place-items-center h-20 w-20 rounded-full bg-primary text-primary-foreground shadow-glow-lg hover:scale-105 transition-transform"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="h-9 w-9 fill-current" /> : <Play className="h-9 w-9 fill-current ml-1" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setPosition((p) => Math.min(MOCK_DURATION, p + 10)); }}
              className="grid place-items-center h-12 w-12 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/70"
              aria-label="Forward 10 seconds"
            >
              <FastForward className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Bottom: episode nav row + progress */}
        <div className="p-4 pb-6 bg-gradient-to-t from-black/85 to-transparent safe-bottom">
          {/* Episode nav row above timeline (hidden for movies) */}
          {!isMovie && (
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex-1 flex justify-start">
                {hasPrev ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); goToEpisode(-1); }}
                    className="inline-flex items-center gap-2 h-9 px-3 sm:px-4 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/70 text-xs sm:text-sm transition-all"
                    aria-label="Previous episode"
                  >
                    <SkipBack className="h-4 w-4" />
                    <span className="hidden xs:inline sm:inline">Previous Episode</span>
                    <span className="xs:hidden sm:hidden">Prev</span>
                  </button>
                ) : <span />}
              </div>
              <div className="flex-1 flex justify-end">
                {hasNext ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); goToEpisode(1); }}
                    className={cn(
                      'inline-flex items-center gap-2 h-9 px-3 sm:px-4 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/70 text-xs sm:text-sm transition-all duration-500',
                      nearEnd && 'bg-primary/20 ring-2 ring-primary/60 shadow-glow scale-[1.04] text-foreground'
                    )}
                    aria-label="Next episode"
                  >
                    <span className="hidden xs:inline sm:inline">Next Episode</span>
                    <span className="xs:hidden sm:hidden">Next</span>
                    <SkipForward className="h-4 w-4" />
                  </button>
                ) : <span />}
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div
            className="group relative h-1.5 bg-foreground/20 rounded-full cursor-pointer"
            onClick={(e) => { e.stopPropagation(); seek(e); }}
          >
            <div className="absolute left-0 top-0 h-full bg-primary rounded-full shadow-glow" style={{ width: `${pct}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-primary shadow-glow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{fmtTime(position)}</span>
            <span>{fmtTime(MOCK_DURATION)}</span>
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
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'absolute z-40 rounded-2xl bg-black/55 backdrop-blur-2xl border border-white/10 shadow-glow-lg overflow-hidden',
              'left-3 right-3 bottom-24 sm:left-auto sm:right-4 sm:bottom-auto sm:top-16 sm:w-80',
              'animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-top-2 duration-200'
            )}
          >
            {settingsView === 'root' ? (
              <div className="py-2">
                <SettingsRootRow
                  icon={Sliders}
                  label="Quality"
                  value={quality}
                  onClick={() => setSettingsView('quality')}
                />
                <SettingsRootRow
                  icon={SubtitlesIcon}
                  label="Subtitles"
                  value={subtitle}
                  onClick={() => setSettingsView('subtitle')}
                />
                <SettingsRootRow
                  icon={Languages}
                  label="Language"
                  value={audio}
                  onClick={() => setSettingsView('audio')}
                />
                <SettingsRootRow
                  icon={Gauge}
                  label="Speed"
                  value={`${speed}x`}
                  onClick={() => setSettingsView('speed')}
                />
              </div>
            ) : (
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => setSettingsView('root')}
                  className="flex items-center gap-2 w-full px-4 h-12 text-sm text-muted-foreground hover:text-foreground border-b border-white/5"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="font-medium text-foreground">
                    {settingsView === 'quality' && 'Quality'}
                    {settingsView === 'subtitle' && 'Subtitles'}
                    {settingsView === 'audio' && 'Language'}
                    {settingsView === 'speed' && 'Speed'}
                  </span>
                </button>
                <div className="py-1 max-h-[50vh] overflow-y-auto">
                  {settingsView === 'quality' && QUALITIES.map((q) => (
                    <SettingsOptionRow
                      key={q}
                      label={q}
                      active={quality === q}
                      onClick={() => { setQuality(q); setSettingsView('root'); }}
                    />
                  ))}
                  {settingsView === 'subtitle' && SUBTITLES.map((s) => (
                    <SettingsOptionRow
                      key={s}
                      label={s}
                      active={subtitle === s}
                      onClick={() => { setSubtitle(s); setSettingsView('root'); }}
                    />
                  ))}
                  {settingsView === 'audio' && AUDIOS.map((a) => (
                    <SettingsOptionRow
                      key={a}
                      label={a}
                      active={audio === a}
                      onClick={() => { setAudio(a); setSettingsView('root'); }}
                    />
                  ))}
                  {settingsView === 'speed' && SPEEDS.map((s) => (
                    <SettingsOptionRow
                      key={s}
                      label={`${s}x`}
                      active={speed === s}
                      onClick={() => { setSpeed(s); setSettingsView('root'); }}
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
          <div className="rounded-2xl bg-background/40 backdrop-blur-xl border border-white/10 px-6 py-5 shadow-glow-lg text-center min-w-[260px]">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Up next</p>
            <p className="font-display text-2xl mt-1">Episode {episode + 1}</p>
            <p className="text-sm text-muted-foreground mt-1">Starting in {autoNext}…</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); cancelAutoNext(); }}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-background/60 hover:bg-background/80 text-sm"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); cancelAutoNext(); navigate(`/watch/${mediaId}/${episode + 1}`, { state: { source, fresh: true } }); }}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm shadow-glow"
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
      <span className="text-sm text-muted-foreground">{value}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function SettingsOptionRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between w-full px-4 h-12 text-sm transition-colors',
        active ? 'text-primary font-medium' : 'text-foreground hover:bg-white/5'
      )}
    >
      <span>{label}</span>
      {active && <Check className="h-4 w-4" />}
    </button>
  );
}
