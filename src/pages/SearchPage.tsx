import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchTMDB } from "@/lib/tmdb";
import MovieCard from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";

const SearchPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchTMDB(query),
    enabled: query.length > 1,
    staleTime: 1000 * 60,
  });

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center gap-2 rounded-lg bg-card px-3 py-2.5">
          <Search className="w-4 h-4 text-primary flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies or series…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      <div className="px-4 mt-4">
        {query.length <= 1 && (
          <p className="text-center text-muted-foreground text-sm mt-20">
            Start typing to search movies and series
          </p>
        )}
        {query.length > 1 && isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        )}
        {query.length > 1 && !isLoading && results?.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-20">
            No results found for "{query}"
          </p>
        )}
        {results && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {results.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
