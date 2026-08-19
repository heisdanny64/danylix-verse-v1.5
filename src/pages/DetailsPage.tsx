import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Download, Play, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useLibrary } from "@/lib/library";
import { buildPlayerHref } from "@/lib/slug";
import EpisodeList from "@/components/EpisodeList";
import CastRow from "@/components/CastRow";
import DownloadModal from "@/components/DownloadModal";
import ShareButton from "@/components/ShareButton";
import {
  contentImageOf,
  getInfo,
  getSeason,
  subjectGenres,
  subjectYear,
  type SubjectKind,
} from "@/services/moviebox";
import { absoluteUrl, formatContentTitle, setDetailsMetadata } from "@/lib/seo";

const DetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { toggleWatchlist, isInWatchlist } = useLibrary();
  const [downloadOpen, setDownloadOpen] = useState(false);

  const { data: info, isLoading } = useQuery({
    queryKey: ["mb-info", id],
    queryFn: () => getInfo(id!),
    enabled: !!id,
  });

  const type: SubjectKind = (info?.type as SubjectKind) || "movie";
  const isSeries = type === "tv" || type === "shorts";
  const contentTitle = info ? formatContentTitle(info.title, info.releaseDate) : "D. Verse";

  useEffect(() => {
    if (!info) return;
    setDetailsMetadata({
      title: contentTitle,
      description: info.description,
      image: absoluteUrl(contentImageOf(info)),
    });

    return () => {
      document.title = "Home - D. Verse";
    };
  }, [contentTitle, info]);

  const { data: seasonData } = useQuery({
    queryKey: ["mb-season", id],
    queryFn: () => getSeason(id!),
    enabled: !!id && isSeries,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pb-8">
        <Skeleton className="h-[50vh] w-full" />
        <div className="mt-4 space-y-3 px-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Content not found</p>
      </div>
    );
  }

  const year = subjectYear(info);
  const genres = subjectGenres(info);
  const inWatchlist = isInWatchlist(info.subjectId || id!);
  const seasons = seasonData?.seasons ?? [];

  const handleToggleWatchlist = () => {
    const added = toggleWatchlist({
      subjectId: info.subjectId || id!,
      title: info.title,
      poster: info.poster,
      type,
    });
    toast({ title: added ? "Added to Library" : "Removed from Library" });
  };

  const play = (se = 1, ep = 1) => navigate(buildPlayerHref(type, id!, se, ep));

  return (
    <div className="min-h-screen pb-28">
      <div className="relative h-[50vh] overflow-hidden">
        <img src={contentImageOf(info)} alt={info.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home"))}
          className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur transition-colors hover:bg-background/80"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="relative z-10 -mt-20 space-y-4 px-4">
        <h1 className="text-3xl font-extrabold leading-tight text-foreground">{info.title}</h1>

        <div className="flex items-center gap-3 text-sm">
          {year && <span className="text-muted-foreground">{year}</span>}
          {info.rating != null && (
            <div className="flex items-center gap-1 text-primary">
              <Star className="h-4 w-4 fill-primary" />
              <span className="font-semibold">{info.rating.toFixed(1)}</span>
            </div>
          )}
          {type === "movie" && info.runtime && (
            <span className="text-muted-foreground">{info.runtime} min</span>
          )}
          {isSeries && seasons.length > 0 && (
            <span className="text-muted-foreground">
              {seasons.length} Season{seasons.length > 1 ? "s" : ""}
            </span>
          )}
          {info.country && <span className="text-muted-foreground">{info.country}</span>}
        </div>

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <span
                key={g}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize text-muted-foreground"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {info.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{info.description}</p>
        )}

        <div className="flex gap-2">
          <Button className="flex-1 gap-1.5" onClick={() => play(isSeries ? 1 : 0, isSeries ? 1 : 0)}>
            <Play className="h-4 w-4 fill-current" />
            Watch Now
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={handleToggleWatchlist}>
            {inWatchlist ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span className="hidden md:inline">{inWatchlist ? "Added" : "Add to Library"}</span>
          </Button>
          <ShareButton
            type={type}
            id={id ?? ""}
            title={contentTitle}
          />
          <Button variant="outline" aria-label="Download" onClick={() => setDownloadOpen(true)}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {isSeries && seasons.length > 0 && (
          <Accordion type="single" collapsible defaultValue={`s-${seasons[0].season}`}>
            {seasons.map((s) => (
              <AccordionItem key={s.season} value={`s-${s.season}`}>
                <AccordionTrigger className="text-sm font-semibold">
                  Season {s.season} · {s.episodesAvailable || s.totalEpisode} episodes
                </AccordionTrigger>
                <AccordionContent>
                  <EpisodeList season={s} onPlay={(se, ep) => play(se, ep)} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {info.staff && info.staff.length > 0 && (
          <CastRow
            cast={info.staff.map((s) => ({ name: s.name, role: s.role, avatar: s.avatar }))}
          />
        )}
      </div>

      <DownloadModal
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        subjectId={id!}
        title={info.title}
      />
    </div>
  );
};

export default DetailsPage;
