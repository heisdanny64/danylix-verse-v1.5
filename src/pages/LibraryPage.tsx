import { useState } from "react";
import { BookmarkPlus } from "lucide-react";
import { useLibrary } from "@/lib/library";
import MovieCard from "@/components/MovieCard";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";

type Filter = "all" | "movie" | "tv";

const LibraryPage = () => {
  const { watchlist } = useLibrary();
  const [filter, setFilter] = useState<Filter>("all");

  const filters: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Movies", value: "movie" },
    { label: "Series", value: "tv" },
  ];

  const filtered = watchlist.filter((m) => {
    if (filter === "all") return true;
    return m.mediaType === filter;
  });

  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground">My Library</h1>
      </header>

      <ContinueWatchingRow />

      <section className="px-4 mt-6">
        <h2 className="text-base font-semibold text-foreground mb-3">Watchlist</h2>

        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((m) => (
              <MovieCard key={`${m.id}-${m.mediaType}`} movie={m as any} mediaType={(m.mediaType === "anime" ? "tv" : m.mediaType) as "movie" | "tv"} compact />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 rounded-lg bg-card border border-border">
            <div className="text-center space-y-2">
              <BookmarkPlus className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Your watchlist is empty</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default LibraryPage;
