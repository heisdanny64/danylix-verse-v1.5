import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, AlertCircle, Loader2 } from "lucide-react";
import {
  findBestMatch,
  getGiftedSources,
  formatBytes,
  type GiftedSource,
} from "@/services/giftedApi";
import { getMovieDetails, getSeasonDetails } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

interface DownloadModalProps {
  open: boolean;
  onClose: () => void;
  type: "movie" | "tv";
  externalId: number;
  title: string;
  year?: number | null;
  totalEpisodes?: number;
  season?: number;
  episode?: number;
}

interface EpSourceState {
  loading: boolean;
  sources: GiftedSource[];
  error?: string;
}

const sortByQualityDesc = (arr: GiftedSource[]) =>
  [...arr].sort((a, b) => {
    const qa = parseInt(String(a.quality).match(/(\d+)/)?.[1] || "0", 10);
    const qb = parseInt(String(b.quality).match(/(\d+)/)?.[1] || "0", 10);
    return qb - qa;
  });

const triggerDownload = (url: string) => {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
};

export default function DownloadModal({
  open,
  onClose,
  type,
  externalId,
  title,
  year,
  totalEpisodes,
}: DownloadModalProps) {
  const isSeries = type === "tv";

  // ---------- MOVIE MODE (unchanged behavior) ----------
  const [movieLoading, setMovieLoading] = useState(false);
  const [movieSources, setMovieSources] = useState<GiftedSource[]>([]);
  const [movieError, setMovieError] = useState<string | null>(null);

  // ---------- COMMON ----------
  const [subjectId, setSubjectId] = useState<string | number | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // ---------- SERIES MODE ----------
  const [seasons, setSeasons] = useState<{ season_number: number; name: string; episode_count: number }[]>([]);
  const [season, setSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<{ episode_number: number; name?: string }[]>([]);
  const [epSources, setEpSources] = useState<Record<number, EpSourceState>>({});
  const [chosenQuality, setChosenQuality] = useState<string | null>(null);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(new Set());
  const [downloading, setDownloading] = useState<{ idx: number; total: number; ep: number } | null>(null);

  // Reset on close
  useEffect(() => {
    if (open) return;
    setMovieLoading(false);
    setMovieSources([]);
    setMovieError(null);
    setSubjectId(null);
    setResolveError(null);
    setSeasons([]);
    setEpisodes([]);
    setEpSources({});
    setChosenQuality(null);
    setSelectedEpisodes(new Set());
    setDownloading(null);
    setSeason(1);
  }, [open]);

  // Resolve subjectId once when opened
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setResolving(true);
      setResolveError(null);
      try {
        const sid = await findBestMatch({ title, year: year ?? null, type, externalId });
        if (cancelled) return;
        if (!sid) { setResolveError("Couldn't find this title in the catalog."); return; }
        setSubjectId(sid);
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, type, externalId, title, year]);

  // ===== MOVIE: fetch sources =====
  useEffect(() => {
    if (!open || isSeries || !subjectId) return;
    let cancelled = false;
    (async () => {
      setMovieLoading(true);
      setMovieError(null);
      try {
        const data = await getGiftedSources(subjectId);
        if (cancelled) return;
        const sorted = sortByQualityDesc(data.results || []);
        setMovieSources(sorted);
        if (sorted.length === 0) setMovieError("No download links available.");
      } catch {
        if (!cancelled) setMovieError("Failed to fetch downloads.");
      } finally {
        if (!cancelled) setMovieLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, isSeries, subjectId]);

  // ===== SERIES: load seasons =====
  useEffect(() => {
    if (!open || !isSeries) return;
    let cancelled = false;
    (async () => {
      try {
          const detail = await getMovieDetails(externalId, "tv");
          if (cancelled) return;
          const seasonList = (detail.seasons || [])
            .filter((s) => s.season_number > 0)
            .map((s) => ({ season_number: s.season_number, name: s.name, episode_count: s.episode_count }));
          setSeasons(seasonList.length ? seasonList : [{ season_number: 1, name: "Season 1", episode_count: 12 }]);
        } catch {
          setSeasons([{ season_number: 1, name: "Season 1", episode_count: 12 }]);
        }
    })();
    return () => { cancelled = true; };
  }, [open, isSeries, type, externalId, totalEpisodes]);

  // ===== SERIES: load episodes for current season =====
  useEffect(() => {
    if (!open || !isSeries || !seasons.length) return;
    let cancelled = false;
    (async () => {
      if (type === "anime") {
        const count = seasons[0]?.episode_count ?? 12;
        setEpisodes(Array.from({ length: count }, (_, i) => ({ episode_number: i + 1 })));
      } else {
        try {
          const sd = await getSeasonDetails(externalId, season);
          if (cancelled) return;
          setEpisodes(
            (sd.episodes || []).map((e) => ({ episode_number: e.episode_number, name: e.name })),
          );
        } catch {
          const sCfg = seasons.find((s) => s.season_number === season);
          setEpisodes(
            Array.from({ length: sCfg?.episode_count ?? 12 }, (_, i) => ({ episode_number: i + 1 })),
          );
        }
      }
      setSelectedEpisodes(new Set());
      setEpSources({});
      setChosenQuality(null);
    })();
    return () => { cancelled = true; };
  }, [open, isSeries, type, externalId, season, seasons]);

  // ===== SERIES: probe first episode for quality list =====
  useEffect(() => {
    if (!open || !isSeries || !subjectId || episodes.length === 0) return;
    let cancelled = false;
    const firstEp = episodes[0].episode_number;
    setEpSources((prev) => ({ ...prev, [firstEp]: { loading: true, sources: [] } }));
    (async () => {
      try {
        const apiEp = type === "anime" ? await resolveAnimeEpisode(externalId, firstEp) : firstEp;
        const data = await getGiftedSources(subjectId, type === "tv" ? season : undefined, apiEp);
        if (cancelled) return;
        const sorted = sortByQualityDesc(data.results || []);
        setEpSources((prev) => ({ ...prev, [firstEp]: { loading: false, sources: sorted } }));
        if (sorted.length > 0 && !chosenQuality) setChosenQuality(sorted[0].quality);
      } catch {
        if (!cancelled) setEpSources((prev) => ({ ...prev, [firstEp]: { loading: false, sources: [], error: "failed" } }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isSeries, subjectId, episodes, type, externalId, season]);

  // ===== SERIES: lazily fetch sources for selected episodes (so size shows) =====
  useEffect(() => {
    if (!isSeries || !subjectId) return;
    selectedEpisodes.forEach((epNum) => {
      if (epSources[epNum]) return;
      setEpSources((prev) => ({ ...prev, [epNum]: { loading: true, sources: [] } }));
      (async () => {
        try {
          const apiEp = type === "anime" ? await resolveAnimeEpisode(externalId, epNum) : epNum;
          const data = await getGiftedSources(subjectId, type === "tv" ? season : undefined, apiEp);
          const sorted = sortByQualityDesc(data.results || []);
          setEpSources((prev) => ({ ...prev, [epNum]: { loading: false, sources: sorted } }));
        } catch {
          setEpSources((prev) => ({ ...prev, [epNum]: { loading: false, sources: [], error: "failed" } }));
        }
      })();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEpisodes, subjectId, isSeries]);

  const availableQualities = useMemo(() => {
    const firstEp = episodes[0]?.episode_number;
    if (!firstEp) return [];
    return epSources[firstEp]?.sources.map((s) => s.quality) ?? [];
  }, [episodes, epSources]);

  const allSelected = episodes.length > 0 && selectedEpisodes.size === episodes.length;
  const toggleAll = () => {
    if (allSelected) setSelectedEpisodes(new Set());
    else setSelectedEpisodes(new Set(episodes.map((e) => e.episode_number)));
  };
  const toggleEpisode = (n: number) => {
    setSelectedEpisodes((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  };

  const sourceForEpisode = (epNum: number): GiftedSource | undefined => {
    const list = epSources[epNum]?.sources || [];
    if (chosenQuality) {
      const exact = list.find((s) => s.quality === chosenQuality);
      if (exact) return exact;
    }
    return list[0];
  };

  const startDownloads = async () => {
    const eps = [...selectedEpisodes].sort((a, b) => a - b);
    if (eps.length === 0 || !subjectId) return;
    setDownloading({ idx: 0, total: eps.length, ep: eps[0] });
    for (let i = 0; i < eps.length; i++) {
      const epNum = eps[i];
      setDownloading({ idx: i + 1, total: eps.length, ep: epNum });
      let s = sourceForEpisode(epNum);
      if (!s) {
        // Force-fetch
        try {
          const apiEp = type === "anime" ? await resolveAnimeEpisode(externalId, epNum) : epNum;
          const data = await getGiftedSources(subjectId, type === "tv" ? season : undefined, apiEp);
          const sorted = sortByQualityDesc(data.results || []);
          setEpSources((prev) => ({ ...prev, [epNum]: { loading: false, sources: sorted } }));
          s = chosenQuality ? sorted.find((x) => x.quality === chosenQuality) ?? sorted[0] : sorted[0];
        } catch { /* skip */ }
      }
      const url = s?.download_url || s?.stream_url;
      if (url) {
        triggerDownload(url);
        // Stagger to give the browser breathing room
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    setDownloading(null);
    setSelectedEpisodes(new Set());
  };

  // ---------- RENDER ----------
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Download</DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{title}</p>
        </DialogHeader>

        {/* Resolution / catalog match status */}
        {(resolving) && (
          <div className="space-y-2 mt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!resolving && resolveError && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{resolveError}</p>
          </div>
        )}

        {/* MOVIE MODE */}
        {!resolving && !resolveError && !isSeries && (
          <div className="space-y-2 mt-2 overflow-y-auto">
            {movieLoading && (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </>
            )}
            {!movieLoading && movieError && (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{movieError}</p>
              </div>
            )}
            {!movieLoading && !movieError && movieSources.map((s, i) => (
              <div
                key={`${s.quality}-${i}`}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{s.quality}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(s.size)}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => triggerDownload(s.download_url || s.stream_url)}
                  disabled={!s.download_url && !s.stream_url}
                  className="gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* SERIES MODE */}
        {!resolving && !resolveError && isSeries && (
          <>
            {/* Quality pills */}
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Quality</p>
              <div className="flex flex-wrap gap-2">
                {availableQualities.length === 0 ? (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Detecting…
                  </span>
                ) : (
                  availableQualities.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setChosenQuality(q)}
                      className={cn(
                        "h-8 px-3 rounded-full text-xs font-medium transition-colors",
                        chosenQuality === q
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {q}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Season dropdown */}
            {seasons.length > 1 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Season</p>
                <Select value={String(season)} onValueChange={(v) => setSeason(Number(v))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((s) => (
                      <SelectItem key={s.season_number} value={String(s.season_number)}>
                        {s.name} ({s.episode_count} eps)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Episode list */}
            <div className="mt-3 flex-1 overflow-y-auto rounded-lg border border-border">
              <label className="flex items-center gap-3 px-3 h-11 border-b border-border bg-muted/30 sticky top-0">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                <span className="text-sm font-medium">Select All ({episodes.length})</span>
              </label>
              <div className="divide-y divide-border">
                {episodes.map((ep) => {
                  const checked = selectedEpisodes.has(ep.episode_number);
                  const epState = epSources[ep.episode_number];
                  const epSource = sourceForEpisode(ep.episode_number);
                  return (
                    <label
                      key={ep.episode_number}
                      className="flex items-center gap-3 px-3 h-12 cursor-pointer hover:bg-muted/30"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleEpisode(ep.episode_number)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          Episode {ep.episode_number}
                          {ep.name && type !== "anime" ? ` · ${ep.name}` : ""}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {epState?.loading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : epSource ? (
                          `${epSource.quality} · ${formatBytes(epSource.size)}`
                        ) : (
                          ""
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Download button */}
            <div className="mt-3 space-y-2">
              {downloading && (
                <div className="text-xs text-center text-muted-foreground">
                  Downloading {downloading.idx}/{downloading.total} · Episode {downloading.ep}
                </div>
              )}
              <Button
                className="w-full gap-1.5"
                onClick={startDownloads}
                disabled={selectedEpisodes.size === 0 || !!downloading}
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {downloading
                  ? "Downloading…"
                  : `Download ${selectedEpisodes.size || ""} ${selectedEpisodes.size === 1 ? "episode" : "episodes"}`.trim()}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
