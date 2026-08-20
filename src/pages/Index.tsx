import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Search } from "lucide-react";
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
      <section className="mx-auto max-w-7xl px-4 pt-6 md:px-8 md:pt-8" aria-labelledby="brand-heading">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">D. Verse</p>
        <h1 id="brand-heading" className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Danylix Verse
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
          Danylix Verse, also known as D. Verse, is your cinematic universe for discovering movies and series, exploring title details, and finding available ways to watch.
        </p>
      </section>

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
