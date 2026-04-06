import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import MovieRow from "@/components/MovieRow";
import HeroBanner from "@/components/HeroBanner";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import {
  getTrending, getTrendingMovies, getTrendingSeries,
  getAnimation, getKidsTeens, getGlobalHits,
  getKoreanDrama, getJapaneseShows, getBlackStories,
  getAction, getRomanceDrama, getComedy, getHorror,
  sortByFreshness, excludeAnime, limitAnime,
} from "@/lib/tmdb";
import { getTrendingAnime, getPopularAnime, animeToCard } from "@/lib/anilist";

const HomePage = () => {
  const navigate = useNavigate();

  const hero = useQuery({ queryKey: ["trending-hero"], queryFn: () => getTrending("all", "day") });

  // Row 1: Trending Now
  const trendingNow = useQuery({ queryKey: ["trending-now"], queryFn: async () => sortByFreshness(await getTrending("all", "day")) });

  // Collect trending IDs for deduplication
  const trendingIds = useMemo(() => {
    const ids = new Set<number>();
    trendingNow.data?.forEach(m => ids.add(m.id));
    return ids;
  }, [trendingNow.data]);

  // Row 4 & 5: Trending Movies/Series (exclude trending now IDs)
  const trendingMovies = useQuery({ queryKey: ["trending-movies"], queryFn: () => getTrendingMovies() });
  const trendingSeries = useQuery({ queryKey: ["trending-series"], queryFn: () => getTrendingSeries() });

  const dedupedMovies = useMemo(() => trendingMovies.data?.filter(m => !trendingIds.has(m.id)) ?? [], [trendingMovies.data, trendingIds]);
  const dedupedSeries = useMemo(() => trendingSeries.data?.filter(m => !trendingIds.has(m.id)) ?? [], [trendingSeries.data, trendingIds]);

  // Anime rows
  const trendingAnime = useQuery({ queryKey: ["trending-anime-anilist"], queryFn: async () => (await getTrendingAnime()).map(animeToCard) });
  const popularAnime = useQuery({ queryKey: ["popular-anime-anilist"], queryFn: async () => (await getPopularAnime()).map(animeToCard) });

  // Category rows
  const animation = useQuery({ queryKey: ["animation"], queryFn: async () => excludeAnime(await getAnimation()) });
  const kidsTeens = useQuery({ queryKey: ["kids-teens"], queryFn: async () => excludeAnime(await getKidsTeens()) });
  const globalHits = useQuery({ queryKey: ["global-hits"], queryFn: async () => limitAnime(await getGlobalHits(), 0.2) });
  const koreanDrama = useQuery({ queryKey: ["korean-dramas"], queryFn: () => getKoreanDrama() });
  const japaneseShows = useQuery({ queryKey: ["japanese-shows"], queryFn: async () => excludeAnime(await getJapaneseShows()) });
  const blackStories = useQuery({ queryKey: ["black-stories"], queryFn: () => getBlackStories() });
  const action = useQuery({ queryKey: ["action"], queryFn: async () => excludeAnime(await getAction()) });
  const romanceDrama = useQuery({ queryKey: ["romance-drama"], queryFn: async () => excludeAnime(await getRomanceDrama()) });
  const comedy = useQuery({ queryKey: ["comedy"], queryFn: async () => excludeAnime(await getComedy()) });
  const horror = useQuery({ queryKey: ["horror"], queryFn: async () => excludeAnime(await getHorror()) });

  return (
    <div className="pb-24 min-h-screen">
      <header className="absolute top-0 left-0 right-0 z-20 px-4 pt-6 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">
          <span className="text-foreground">D.</span>
          <span className="text-primary">Verse</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Danylix Verse</p>
      </header>

      <HeroBanner movies={hero.data ?? []} />

      <div className="px-4 my-4">
        <button
          onClick={() => navigate("/search")}
          className="flex w-full items-center gap-3 rounded-lg bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          <Search className="w-4 h-4 text-primary" />
          Search movies, series, or anime…
        </button>
      </div>

      <div className="space-y-6">
        {/* 1. Trending Now */}
        <MovieRow title="Trending Now" movies={trendingNow.data ?? []} isLoading={trendingNow.isLoading} slug="trending-today" />

        {/* 2. Picked For You — skipped (no user profile) */}

        {/* 3. Continue Watching */}
        <ContinueWatchingRow />

        {/* 4. Trending Movies */}
        <MovieRow title="Trending Movies" movies={dedupedMovies} isLoading={trendingMovies.isLoading} mediaType="movie" slug="trending-movies" />

        {/* 5. Trending Series */}
        <MovieRow title="Trending Series" movies={dedupedSeries} isLoading={trendingSeries.isLoading} mediaType="tv" slug="trending-series" />

        {/* 6. Trending Anime */}
        <MovieRow title="Trending Anime" movies={trendingAnime.data ?? []} isLoading={trendingAnime.isLoading} mediaType="anime" slug="trending-anime" />

        {/* 7. Popular Anime */}
        <MovieRow title="Popular Anime" movies={popularAnime.data ?? []} isLoading={popularAnime.isLoading} mediaType="anime" slug="popular-anime" />

        {/* 8. Animation */}
        <MovieRow title="Animation" movies={animation.data ?? []} isLoading={animation.isLoading} slug="animation" />

        {/* 9. Kids & Teens */}
        <MovieRow title="Kids & Teens" movies={kidsTeens.data ?? []} isLoading={kidsTeens.isLoading} mediaType="tv" slug="kids-teens" />

        {/* 10. Global Hits */}
        <MovieRow title="Global Hits" movies={globalHits.data ?? []} isLoading={globalHits.isLoading} mediaType="movie" slug="global-hits" />

        {/* 11. Korean Drama */}
        <MovieRow title="Korean Drama" movies={koreanDrama.data ?? []} isLoading={koreanDrama.isLoading} mediaType="tv" slug="korean-dramas" />

        {/* 12. Japanese Shows */}
        <MovieRow title="Japanese Shows" movies={japaneseShows.data ?? []} isLoading={japaneseShows.isLoading} mediaType="tv" slug="japanese-shows" />

        {/* 13. Black Stories */}
        <MovieRow title="Black Stories" movies={blackStories.data ?? []} isLoading={blackStories.isLoading} mediaType="movie" slug="black-stories" />

        {/* 14. Action & Adventure */}
        <MovieRow title="Action & Adventure" movies={action.data ?? []} isLoading={action.isLoading} mediaType="movie" slug="action" />

        {/* 15. Romance & Drama */}
        <MovieRow title="Romance & Drama" movies={romanceDrama.data ?? []} isLoading={romanceDrama.isLoading} mediaType="movie" slug="romance-drama" />

        {/* 16. Comedy & Feel-Good */}
        <MovieRow title="Comedy & Feel-Good" movies={comedy.data ?? []} isLoading={comedy.isLoading} mediaType="movie" slug="comedy" />

        {/* 17. Horror */}
        <MovieRow title="Horror" movies={horror.data ?? []} isLoading={horror.isLoading} mediaType="movie" slug="horror" />
      </div>
    </div>
  );
};

export default HomePage;
