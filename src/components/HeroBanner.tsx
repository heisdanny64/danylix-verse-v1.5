import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Play, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/lib/library";
import { buildDetailsHref } from "@/lib/slug";
import { posterOf, subjectYear, type MovieBoxSubject } from "@/services/moviebox";

interface HeroBannerProps {
  subjects: MovieBoxSubject[];
  isLoading?: boolean;
}

const HeroBanner = ({ subjects, isLoading }: HeroBannerProps) => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const { toggleWatchlist, isInWatchlist } = useLibrary();

  const featured = subjects.slice(0, 6);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % featured.length), 6000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (isLoading) return <div className="h-[55vh] w-full animate-pulse bg-muted/40" />;
  if (!featured.length) return null;

  const subject = featured[Math.min(current, featured.length - 1)];
  const year = subjectYear(subject);
  const inWatchlist = isInWatchlist(subject.subjectId);

  return (
    <div className="relative h-[55vh] w-full overflow-hidden">
      <img
        src={posterOf(subject)}
        alt={subject.title}
        className="h-full w-full object-cover transition-opacity duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

      <div className="absolute bottom-8 left-4 right-4 space-y-3">
        <h2 className="line-clamp-2 text-2xl font-extrabold leading-tight text-foreground">
          {subject.title}
        </h2>
        <div className="flex items-center gap-3 text-sm">
          {year && <span className="text-muted-foreground">{year}</span>}
          {subject.rating != null && (
            <div className="flex items-center gap-1 text-primary">
              <Star className="h-3.5 w-3.5 fill-primary" />
              <span className="font-semibold">{subject.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        {subject.description && (
          <p className="line-clamp-2 max-w-[80%] text-xs text-muted-foreground">{subject.description}</p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => navigate(buildDetailsHref(subject.type, subject.subjectId))}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Watch Now
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              toggleWatchlist({
                subjectId: subject.subjectId,
                title: subject.title,
                poster: subject.poster,
                type: subject.type,
              })
            }
          >
            {inWatchlist ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {inWatchlist ? "Added" : "Add to Library"}
          </Button>
        </div>

        {featured.length > 1 && (
          <div className="flex gap-1.5 pt-1">
            {featured.map((_, i) => (
              <button
                key={i}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/40"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroBanner;
