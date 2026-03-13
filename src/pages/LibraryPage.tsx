import { BookmarkPlus, Play } from "lucide-react";

const LibraryPage = () => {
  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground">My Library</h1>
      </header>

      {/* Continue Watching */}
      <section className="px-4 mb-8">
        <h2 className="text-base font-semibold text-foreground mb-3">Continue Watching</h2>
        <div className="flex items-center justify-center h-32 rounded-lg bg-card border border-border">
          <div className="text-center space-y-2">
            <Play className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Nothing here yet</p>
          </div>
        </div>
      </section>

      {/* Watchlist */}
      <section className="px-4">
        <h2 className="text-base font-semibold text-foreground mb-3">Watchlist</h2>
        <div className="flex items-center justify-center h-32 rounded-lg bg-card border border-border">
          <div className="text-center space-y-2">
            <BookmarkPlus className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Your watchlist is empty</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LibraryPage;
