import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchTMDB } from "@/lib/tmdb";
import { searchAniList, animeToCard } from "@/lib/anilist";
import MovieCard from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type FilterType = "all" | "movie" | "tv" | "anime";

function deduplicateResults(tmdbResults: any[], animeResults: any[]) {
  const animeTitles = new Set(
    animeResults.map((a) => a.title?.toLowerCase().trim()).filter(Boolean)
  );
  const filtered = tmdbResults.filter((t) => {
    const title = (t.title || t.name || "").toLowerCase().trim();
    return !animeTitles.has(title);
  });
  return [...filtered, ...animeResults];
}

const SearchPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const { user } = useAuth();

  // Persist meaningful searches to history (debounced + only when results are likely)
  useEffect(() => {
    if (!user?.id) return;
    const trimmed = query.trim();
    if (trimmed.length < 3) return;
    const t = window.setTimeout(() => {
      void supabase.from("search_history").insert({ user_id: user.id, query: trimmed });
    }, 1500);
    return () => window.clearTimeout(t);
  }, [query, user?.id]);

  const { data: tmdbResults, isLoading: tmdbLoading } = useQuery({
    queryKey: ["search-tmdb", query],
    queryFn: () => searchTMDB(query),
    enabled: query.length > 1,
    staleTime: 1000 * 60,
  });

  const { data: animeResults, isLoading: animeLoading } = useQuery({
    queryKey: ["search-anilist", query],
    queryFn: async () => {
      const results = await searchAniList(query);
      return results.map(animeToCard);
    },
    enabled: query.length > 1,
    staleTime: 1000 * 60,
  });

  const isLoading = tmdbLoading || animeLoading;

  const combined = deduplicateResults(tmdbResults || [], animeResults || []);

  const filtered =
    filter === "all"
      ? combined
      : combined.filter((item) => {
          const type = item.media_type || "movie";
          return type === filter;
        });

  const filters: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Movies", value: "movie" },
    { label: "TV", value: "tv" },
    { label: "Anime", value: "anime" },
  ];

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-2 rounded-lg bg-card px-3 py-2.5">
            <Search className="w-4 h-4 text-primary flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, series, or anime…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        {/* Filter buttons */}
        {query.length > 1 && (
          <div className="flex gap-2">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-4">
        {query.length <= 1 && (
          <p className="text-center text-muted-foreground text-sm mt-20">
            Start typing to search movies, series, and anime
          </p>
        )}
        {query.length > 1 && isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        )}
        {query.length > 1 && !isLoading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-20">
            No results found for "{query}"
          </p>
        )}
        {filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((item) => (
              <MovieCard
                key={`${item.media_type}-${item.id}`}
                movie={item}
                mediaType={item.media_type}
                compact
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
