import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchTMDB } from "@/lib/tmdb";
import { searchGifted } from "@/services/giftedApi";
import { tmdbToMediaItem, giftedToMediaItem, mediaToTmdbCard, normalizeTitle, variantKey, isVariant, GIFTED_CLEAN_REGEX, type MediaItem } from "@/lib/media";
import MovieCard from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type FilterType = "all" | "movie" | "tv";

function mergeResults(tmdb: MediaItem[], gifted: MediaItem[]): MediaItem[] {
  const tmdbKeys = new Set(tmdb.map((t) => normalizeTitle(t.title)));
  
  // 1. Clean Gifted results (remove seasons)
  const cleanedGifted = gifted.filter(g => !GIFTED_CLEAN_REGEX.test(g.title));

  // 2. Deduplicate against TMDB
  const giftedFiltered = cleanedGifted.filter((g) => {
    const n = normalizeTitle(g.title);
    const existsInTmdb = tmdbKeys.has(n);

    if (existsInTmdb) {
      // If it matches TMDB, only keep if it's a variant ([English], etc)
      return isVariant(g.title);
    }
    
    // If it doesn't exist in TMDB, keep it (Nollywood, etc)
    return true;
  });

  return [...tmdb, ...giftedFiltered];
}

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const [filter, setFilter] = useState<FilterType>("all");
  const { user } = useAuth();

  // Sync query → URL (debounced)
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (query.trim()) next.set("q", query.trim());
      else next.delete("q");
      setSearchParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(t);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist meaningful searches
  useEffect(() => {
    if (!user?.id) return;
    const trimmed = query.trim();
    if (trimmed.length < 3) return;
    const t = window.setTimeout(() => {
      void supabase.from("search_history").insert({ user_id: user.id, query: trimmed });
    }, 1500);
    return () => window.clearTimeout(t);
  }, [query, user?.id]);

  // Parallel Search Execution
  const { data: tmdbResults, isLoading: tmdbLoading } = useQuery({
    queryKey: ["search-tmdb", query],
    queryFn: () => searchTMDB(query),
    enabled: query.length > 1,
    staleTime: 1000 * 60,
  });

  const { data: giftedResults, isLoading: giftedLoading } = useQuery({
    queryKey: ["search-gifted", query],
    queryFn: () => searchGifted(query),
    enabled: query.length > 1,
    staleTime: 1000 * 60,
  });

  const isLoading = tmdbLoading || giftedLoading;

  // Only merge AFTER both requests resolve (or at least one has data and the other is not loading)
  const finalResults = useMemo(() => {
    if (query.length <= 1) return [];
    
    const tmdbItems: MediaItem[] = (tmdbResults || [])
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .map((r) => tmdbToMediaItem(r as any, r.media_type as "movie" | "tv"));
    
    const giftedItems: MediaItem[] = (giftedResults || []).map(giftedToMediaItem);
    
    return mergeResults(tmdbItems, giftedItems);
  }, [tmdbResults, giftedResults, query]);

  const filtered = finalResults.filter((m) => {
    if (filter === "all") return true;
    return m.type === filter;
  });

  const filters: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Movies", value: "movie" },
    { label: "TV", value: "tv" },
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
                key={`${item.source}-${item.type}-${item.id}`}
                movie={mediaToTmdbCard(item)}
                mediaType={item.type}
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
