import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import MovieRow from "@/components/MovieRow";
import HeroBanner from "@/components/HeroBanner";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import {
  getHomeRows,
  getHomeSubjects,
  isAllowedRow,
  isHeroRow,
  type MovieBoxRowMeta,
} from "@/services/moviebox";

const STALE = 15 * 60 * 1000;

const HomePage = () => {
  const navigate = useNavigate();
  const [showBrandNotice, setShowBrandNotice] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.sessionStorage.getItem("dverse-brand-notice-dismissed") !== "1";
    } catch {
      return true;
    }
  });

  const dismissBrandNotice = () => {
    setShowBrandNotice(false);
    try {
      window.sessionStorage.setItem("dverse-brand-notice-dismissed", "1");
    } catch {
      // Dismissal still applies for the current render when storage is unavailable.
    }
  };

  useEffect(() => {
    document.title = "Danylix Verse (D. Verse) - Movies & Series";
  }, []);

  const rowsQuery = useQuery({
    queryKey: ["home-rows"],
    queryFn: getHomeRows,
    staleTime: STALE,
  });

  const allRows: MovieBoxRowMeta[] = rowsQuery.data?.rows ?? [];
  const heroRow = allRows.find((r) => isHeroRow(r.title));
  const contentRows = allRows.filter((r) => isAllowedRow(r.title));

  const heroQuery = useQuery({
    queryKey: ["home-subjects", heroRow?.opId],
    queryFn: () => getHomeSubjects(heroRow!.opId),
    enabled: !!heroRow,
    staleTime: STALE,
  });

  const rowQueries = useQueries({
    queries: contentRows.map((row) => ({
      queryKey: ["home-subjects", row.opId],
      queryFn: () => getHomeSubjects(row.opId),
      staleTime: STALE,
    })),
  });

  // The Banner row is sometimes empty upstream — fall back to the first
  // populated content row so the hero is never blank.
  const heroSubjects = heroQuery.data?.subjects?.length
    ? heroQuery.data.subjects
    : (rowQueries.find((q) => q.data?.subjects?.length)?.data?.subjects ?? []);
  const heroLoading =
    rowsQuery.isLoading || heroQuery.isLoading || (!heroSubjects.length && rowQueries.some((q) => q.isLoading));

  return (
    <div className="min-h-screen pb-28">
      {showBrandNotice && (
        <section className="mx-auto max-w-7xl px-4 pt-4 md:px-8 md:pt-6" aria-labelledby="brand-heading">
          <div className="relative flex items-center overflow-hidden rounded-full border border-primary/20 bg-card/80 py-2.5 pl-4 pr-12 shadow-sm backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-card to-transparent" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 right-11 z-10 w-8 bg-gradient-to-l from-card to-transparent" aria-hidden="true" />
            <div className="dverse-marquee-viewport min-w-0 flex-1 overflow-hidden">
              <div className="dverse-marquee-track flex min-w-max items-center">
                <div className="dverse-marquee-content flex shrink-0 items-center gap-5 pr-10">
                  <h1 id="brand-heading" className="shrink-0 text-sm font-semibold tracking-wide md:text-base">
                    <span className="text-primary">D.</span>{" "}
                    <span className="text-white">Verse</span>
                  </h1>
                  <span className="dverse-marquee-copy text-xs text-muted-foreground md:text-sm">
                    Your cinematic universe for movies and series
                  </span>
                </div>
                <div className="dverse-marquee-content dverse-marquee-duplicate flex shrink-0 items-center gap-5 pr-10" aria-hidden="true">
                  <span className="text-sm font-semibold tracking-wide md:text-base">
                    <span className="text-primary">D.</span>{" "}
                    <span className="text-white">Verse</span>
                  </span>
                  <span className="dverse-marquee-copy text-xs text-muted-foreground md:text-sm">
                    Your cinematic universe for movies and series
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissBrandNotice}
              className="absolute right-2 z-20 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Dismiss D. Verse announcement"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      <HeroBanner subjects={heroSubjects.slice(0, 6)} isLoading={heroLoading} />

      <div className="my-4 px-4 md:hidden">
        <button
          onClick={() => navigate("/search")}
          className="flex w-full items-center gap-3 rounded-full bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          <Search className="h-4 w-4 text-primary" />
          Search movies, series or shorts…
        </button>
      </div>

      <div className="space-y-6">
        <ContinueWatchingRow />
        {rowsQuery.isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <MovieRow key={`sk-${i}`} title="" subjects={[]} isLoading />
          ))}
        {contentRows.map((row, i) => {
          const q = rowQueries[i];
          const subjects = (q?.data?.subjects ?? []).filter((s) => s.hasResource !== false);
          if (!q?.isLoading && subjects.length < 3) return null;
          return (
            <MovieRow
              key={row.opId}
              title={row.title}
              subjects={subjects}
              isLoading={q?.isLoading}
            />
          );
        })}
      </div>
    </div>
  );
};

export default HomePage;
