import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getDownloadPack } from "@/services/moviebox";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  title: string;
}

const DownloadModal = ({ open, onOpenChange, subjectId, title }: Props) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["mb-download", subjectId],
    queryFn: () => getDownloadPack(subjectId),
    enabled: open && !!subjectId,
    staleTime: 5 * 60 * 1000,
  });

  const seasons = data?.seasons ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="line-clamp-2 text-left">Download · {title}</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {isError && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Couldn’t load download links. Try again later.
          </p>
        )}
        {!isLoading && !isError && seasons.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No downloads available.</p>
        )}

        {seasons.map((season) => (
          <div key={season.season} className="space-y-2">
            {seasons.length > 1 && (
              <p className="text-sm font-semibold text-foreground">Season {season.season}</p>
            )}
            <Accordion type="single" collapsible>
              {season.episodes.map((ep) => (
                <AccordionItem key={ep.episode} value={`s${season.season}e${ep.episode}`}>
                  <AccordionTrigger className="text-sm">
                    {ep.episode === 0 ? "Movie" : `Episode ${ep.episode}`}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    {ep.qualities.map((q) => (
                      <a
                        key={`${q.resolution}-${q.url}`}
                        href={q.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted"
                      >
                        <span className="font-medium text-foreground">{q.quality}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {q.size}
                          <Download className="h-4 w-4" />
                        </span>
                      </a>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
};

export default DownloadModal;
