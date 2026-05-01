import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, AlertCircle } from "lucide-react";
import {
  findBestMatch,
  getGiftedSources,
  resolveAnimeEpisode,
  formatBytes,
  type GiftedSource,
} from "@/services/giftedApi";

interface DownloadModalProps {
  open: boolean;
  onClose: () => void;
  type: "movie" | "tv" | "anime";
  externalId: number;
  title: string;
  year?: number | null;
  season?: number;
  episode?: number;
}

export default function DownloadModal({
  open,
  onClose,
  type,
  externalId,
  title,
  year,
  season,
  episode,
}: DownloadModalProps) {
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<GiftedSource[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSources([]);
      try {
        const subjectId = await findBestMatch({ title, year: year ?? null, type, externalId });
        if (!subjectId) {
          if (!cancelled) setError("Couldn't find this title in the catalog.");
          return;
        }
        const ep =
          type === "anime" && episode
            ? await resolveAnimeEpisode(externalId, episode)
            : episode;
        const data = await getGiftedSources(subjectId, type === "tv" ? season : undefined, type === "movie" ? undefined : ep);
        if (cancelled) return;
        const sorted = [...(data.results || [])].sort((a, b) => {
          const qa = parseInt(String(a.quality).match(/(\d+)/)?.[1] || "0", 10);
          const qb = parseInt(String(b.quality).match(/(\d+)/)?.[1] || "0", 10);
          return qb - qa;
        });
        setSources(sorted);
        if (sorted.length === 0) setError("No download links available.");
      } catch (e) {
        if (!cancelled) setError("Failed to fetch downloads.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, type, externalId, title, year, season, episode]);

  const triggerDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download</DialogTitle>
          <p className="text-sm text-muted-foreground truncate">
            {title}{type !== "movie" && season != null && episode != null ? ` · S${season}E${episode}` : ""}
          </p>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {loading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {!loading && !error && sources.map((s, i) => (
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
      </DialogContent>
    </Dialog>
  );
}