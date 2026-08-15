import { Link } from "react-router-dom";
import { Play, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLibrary } from "@/lib/library";
import { buildPlayerHref } from "@/lib/slug";
import { POSTER_FALLBACK } from "@/services/moviebox";

const ContinueWatchingRow = () => {
  const { continueWatching, removeFromContinue } = useLibrary();

  if (!continueWatching.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="px-4 text-lg font-bold text-foreground">Continue Watching</h2>
      <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-2">
        {continueWatching.map((item) => (
          <div
            key={item.id}
            className="relative flex-shrink-0"
            style={{ width: "clamp(220px, 60vw, 320px)" }}
          >
            <Link to={buildPlayerHref(item.type, item.id, item.se, item.ep)} className="group block">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                <img
                  src={item.poster || POSTER_FALLBACK}
                  alt={item.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 transition-opacity group-hover:opacity-100">
                  <Play className="h-8 w-8 fill-current text-foreground" />
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <p className="line-clamp-1 text-sm font-medium text-foreground">{item.title}</p>
                {item.type !== "movie" && (
                  <p className="text-xs text-muted-foreground">
                    S{item.se} · E{item.ep}
                  </p>
                )}
                <Progress value={item.progress} className="h-1" />
              </div>
            </Link>
            <button
              onClick={() => removeFromContinue(item.id)}
              aria-label="Remove"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ContinueWatchingRow;
