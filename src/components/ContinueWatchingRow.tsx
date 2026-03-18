import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { posterUrl, getDisplayInfo } from "@/lib/tmdb";
import { useLibrary, type ContinueWatchingItem } from "@/lib/library";
import { Progress } from "@/components/ui/progress";

const ContinueWatchingRow = () => {
  const { continueWatching } = useLibrary();

  if (!continueWatching.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-foreground px-4">Continue Watching</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {continueWatching.map((item: ContinueWatchingItem) => {
          const { title } = getDisplayInfo(item.movie);
          const link = `/details/${item.mediaType}/${item.movie.id}`;

          return (
            <Link key={item.movie.id} to={link} className="flex-shrink-0 w-[160px] group">
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <div className="aspect-video">
                  <img
                    src={posterUrl(item.movie.backdrop_path || item.movie.poster_path, "w300")}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-8 h-8 text-foreground fill-foreground" />
                </div>
                <Progress value={item.progress} className="absolute bottom-0 left-0 right-0 h-1 rounded-none" />
              </div>
              <p className="text-xs font-medium text-foreground mt-1.5 truncate">{title}</p>
              {item.mediaType === "tv" && item.season && item.episode && (
                <p className="text-xs text-muted-foreground">S{item.season} E{item.episode}</p>
              )}
              {item.mediaType === "anime" && item.episode && (
                <p className="text-xs text-muted-foreground">EP {item.episode}</p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default ContinueWatchingRow;
