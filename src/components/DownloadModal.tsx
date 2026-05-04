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
  externalId: number | string;
  title: string;
  year?: number | null;
  totalEpisodes?: number;
  season?: number;
  episode?: number;
  source?: "tmdb" | "gifted";
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
  source = "tmdb",
}: DownloadModalProps) {
  const isSeries = type === "tv";

  // ---------- MOVIE MODE ----------
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
    if (source === "gifted") {
      setSubjectId(externalId);
      return;
    }
    let cancelled = false;
    (async () => {
      setResolving(true);
      setResolveError(null);
      try {
        const sid = await findBestMatch({ title, year: year ?? null, type, externalId: Number(externalId) });
        if (cancelled) return;
        if (!sid) { setResolveError("Couldn't find this title in the catalog."); return; }
        setSubjectId(sid);
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, type, externalId, title, year, source]);

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
    if (source === "gifted") {
      setSeasons([{ season_number: 1, name: "Season 1", episode_count: 1 }]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
          const detail = await getMovieDetails(Number(externalId), "tv");
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
  }, [open, isSeries, type, externalId, totalEpisodes, source]);

  // ===== SERIES: load episodes for current season =====
  useEffect(() => {
    if (!open || !isSeries || !seasons.length) return;
    if (source === "gifted") {
      setEpisodes([{ episode_number: 1, name: "Episode 1" }]);
      setSelectedEpisodes(new Set());
      setEpSources({});
      setChosenQuality(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
          const sd = await getSeasonDetails(Number(externalId), season);
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
      setSelectedEpisodes(new Set());
      setEpSources({});
      setChosenQuality(null);
    })();
    return () => { cancelled = true; };
  }, [open, isSeries, type, externalId, season, seasons, source]);

  // ===== SERIES: probe first episode for quality list =====
  useEffect(() => {
    if (!open || !isSeries || !subjectId || episodes.length === 0) return;
    let cancelled = false;
    const firstEp = episodes[0].episode_number;
    setEpSources((prev) => ({ ...prev, [firstEp]: { loading: true, sources: [] } }));
    (async () => {
      try {
        const data = await getGiftedSources(subjectId, season, firstEp);
        if (cancelled) return;
        const sorted = sortByQualityDesc(data.results || []);
        setEpSources((prev) => ({ ...prev, [firstEp]: { loading: false, sources: sorted } }));
        if (sorted.length > 0 && !chosenQuality) setChosenQuality(sorted[0].quality);
      } catch {
        if (!cancelled) setEpSources((prev) => ({ ...prev, [firstEp]: { loading: false, sources: [], error: "failed" } }));
      }
    })();
    return () => { cancelled = true; };
  }, [open, isSeries, subjectId, episodes, type, externalId, season]);

  // ===== SERIES: lazily fetch sources for selected episodes (so size shows) =====
  useEffect(() => {
    if (!isSeries || !subjectId) return;
    selectedEpisodes.forEach((epNum) => {
      if (epSources[epNum]) return;
      setEpSources((prev) => ({ ...prev, [epNum]: { loading: true, sources: [] } }));
      (async () => {
        try {
          const data = await getGiftedSources(subjectId, season, epNum);
          const sorted = sortByQualityDesc(data.results || []);
          setEpSources((prev) => ({ ...prev, [epNum]: { loading: false, sources: sorted } }));
        } catch {
          setEpSources((prev) => ({ ...prev, [epNum]: { loading: false, sources: [], error: "failed" } }));
        }
      })();
    });
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
        try {
          const data = await getGiftedSources(subjectId, season, epNum);
          const sorted = sortByQualityDesc(data.results || []);
          setEpSources((prev) => ({ ...prev, [epNum]: { loading: false, sources: sorted } }));
          s = chosenQuality ? sorted.find((x) => x.quality === chosenQuality) ?? sorted[0] : sorted[0];
        } catch { /* skip */ }
      }
      const url = s?.download_url || s?.stream_url;
      if (url) {
        triggerDownload(url);
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    setDownloading(null);
    setSelectedEpisodes(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Download</DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{title}</p>
        </DialogHeader>

        {(resolving) && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Searching catalog...</p>
          </div>
        )}

        {resolveError && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <p className="text-sm font-medium">{resolveError}</p>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        )}

        {!resolving && !resolveError && subjectId && (
          <div className="flex-1 overflow-y-auto min-h-0 py-2 space-y-6">
            {!isSeries ? (
              <div className="space-y-3">
                {movieLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                  </div>
                ) : movieError ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">{movieError}</p>
                ) : (
                  movieSources.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => triggerDownload(s.download_url || s.stream_url)}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Download className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold">{s.quality}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{formatBytes(s.size)}</p>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">Download</div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Season</label>
                    <Select value={String(season)} onValueChange={(v) => setSeason(Number(v))}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {seasons.map((s) => (
                          <SelectItem key={s.season_number} value={String(s.season_number)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Quality</label>
                    <Select value={chosenQuality || ""} onValueChange={setChosenQuality}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select quality" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableQualities.map((q) => (
                          <SelectItem key={q} value={q}>{q}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Episodes</h4>
                    <button onClick={toggleAll} className="text-xs font-bold text-primary hover:underline">
                      {allSelected ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {episodes.map((ep) => {
                      const s = sourceForEpisode(ep.episode_number);
                      const loading = epSources[ep.episode_number]?.loading;
                      return (
                        <div
                          key={ep.episode_number}
                          onClick={() => toggleEpisode(ep.episode_number)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                            selectedEpisodes.has(ep.episode_number)
                              ? "bg-primary/5 border-primary/30"
                              : "bg-muted/30 border-transparent hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={selectedEpisodes.has(ep.episode_number)} />
                            <div className="text-left">
                              <p className="text-sm font-medium">Episode {ep.episode_number}</p>
                              {ep.name && <p className="text-[10px] text-muted-foreground line-clamp-1">{ep.name}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            {loading ? (
                              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                            ) : s ? (
                              <p className="text-[10px] font-bold text-muted-foreground">{formatBytes(s.size)}</p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {isSeries && !resolving && !resolveError && subjectId && (
          <div className="pt-4 border-t">
            <Button
              className="w-full rounded-xl h-12 font-bold gap-2"
              disabled={selectedEpisodes.size === 0 || !!downloading}
              onClick={startDownloads}
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Downloading {downloading.idx}/{downloading.total} (Ep {downloading.ep})
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download {selectedEpisodes.size} Episode{selectedEpisodes.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
