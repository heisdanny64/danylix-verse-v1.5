import { Link } from "react-router-dom";
import { Library as LibraryIcon, X } from "lucide-react";
import { useLibrary } from "@/lib/library";
import { buildDetailsHref } from "@/lib/slug";
import { POSTER_FALLBACK } from "@/services/moviebox";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";

const LibraryPage = () => {
  const { watchlist, removeFromWatchlist } = useLibrary();

  return (
    <div className="min-h-screen pb-28">
      <header className="px-4 pb-2 pt-6">
        <h1 className="text-2xl font-extrabold text-foreground">Your Library</h1>
      </header>

      <div className="space-y-6 py-4">
        <ContinueWatchingRow />

        <section className="space-y-3 px-4">
          <h2 className="text-lg font-bold text-foreground">Watchlist</h2>
          {watchlist.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <LibraryIcon className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nothing saved yet. Add titles to see them here.
              </p>
              <Link to="/home" className="text-sm font-medium text-primary">
                Browse content
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {watchlist.map((item) => (
                <div key={item.id} className="relative">
                  <Link to={buildDetailsHref(item.type, item.id)} className="group block">
                    <div className="aspect-[2/3] overflow-hidden rounded-xl bg-muted">
                      <img
                        src={item.poster || POSTER_FALLBACK}
                        alt={item.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs font-medium text-foreground">
                      {item.title}
                    </p>
                  </Link>
                  <button
                    onClick={() => removeFromWatchlist(item.id)}
                    aria-label="Remove from library"
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default LibraryPage;
