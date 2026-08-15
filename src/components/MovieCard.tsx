import { Link } from "react-router-dom";
import { buildDetailsHref } from "@/lib/slug";
import { posterOf, subjectYear, type MovieBoxSubject } from "@/services/moviebox";

interface MovieCardProps {
  subject: MovieBoxSubject;
  compact?: boolean;
  variant?: "portrait" | "landscape";
}

const MovieCard = ({ subject, compact, variant = "portrait" }: MovieCardProps) => {
  const year = subjectYear(subject);
  const isLandscape = variant === "landscape";
  const typeLabel = subject.type === "tv" ? "TV" : subject.type === "shorts" ? "SHORTS" : "MOVIE";

  return (
    <Link
      to={buildDetailsHref(subject.type, subject.subjectId)}
      className={`group flex-shrink-0 ${compact ? "w-full" : ""}`}
      style={
        compact
          ? undefined
          : { width: isLandscape ? "clamp(220px, 60vw, 320px)" : "clamp(130px, 22vw, 220px)" }
      }
    >
      <div className="relative overflow-hidden rounded-xl transition-all duration-300 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)] group-hover:ring-1 group-hover:ring-primary/50">
        <div className={isLandscape ? "aspect-video bg-muted" : "aspect-[2/3] bg-muted"}>
          <img
            src={posterOf(subject)}
            alt={subject.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <span className="absolute top-1.5 right-1.5 rounded bg-background/70 px-1.5 py-0.5 text-[9px] font-bold leading-none text-foreground backdrop-blur-sm">
          {typeLabel}
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-3 pt-8">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
            {subject.title}
          </h3>
          {year && <p className="mt-0.5 text-xs text-muted-foreground">{year}</p>}
        </div>
      </div>
    </Link>
  );
};

export default MovieCard;
