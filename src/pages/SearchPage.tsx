import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Search as SearchIcon } from "lucide-react";
import MovieCard from "@/components/MovieCard";
import { searchSubjects } from "@/services/moviebox";

const SearchPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [term, setTerm] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(term.trim());
      setPage(1);
      setParams(term.trim() ? { q: term.trim() } : {}, { replace: true });
    }, 400);
    return () => clearTimeout(t);
  }, [term, setParams]);

  const { data, isFetching } = useQuery({
    queryKey: ["mb-search", query, page],
    queryFn: () => searchSubjects(query, page),
    enabled: query.length > 1,
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.items ?? [];

  return (
    <div className="min-h-screen pb-28">
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home"))}
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-card px-4 py-2">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search movies, series or shorts…"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className="px-4 py-4">
        {query.length > 1 && !isFetching && items.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No results for “{query}”.
          </p>
        )}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {items.map((s) => (
            <MovieCard key={s.subjectId} subject={s} compact />
          ))}
        </div>

        {data?.pager?.hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full bg-card px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
