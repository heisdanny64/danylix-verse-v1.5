import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import MovieRow from "@/components/MovieRow";
import HeroBanner from "@/components/HeroBanner";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import {
  getTrending, getPopular, getTopRated, getByGenre, getByLanguage,
  getHiddenGems, GENRE_IDS, sortByFreshness,
} from "@/lib/tmdb";
import { getTopAnime, getCurrentSeasonAnime, getUpcomingAnime } from "@/lib/jikan";

const HomePage = () => {
  const navigate = useNavigate();

  const hero = useQuery({ queryKey: ["trending-hero"], queryFn: () => getTrending("all", "day") });
  const trendingToday = useQuery({ queryKey: ["trending-today"], queryFn: async () => sortByFreshness(await getTrending("all", "day")) });
  const pickedForYou = useQuery({ queryKey: ["picked-for-you"], queryFn: async () => sortByFreshness(await getPopular("movie")) });
  const popularWeek = useQuery({ queryKey: ["popular-week"], queryFn: async () => sortByFreshness(await getTrending("all", "week")) });
  const topRated = useQuery({ queryKey: ["top-rated-movies"], queryFn: () => getTopRated("movie") });
  const action = useQuery({ queryKey: ["action-movies"], queryFn: () => getByGenre(GENRE_IDS.action, "movie") });
  const comedy = useQuery({ queryKey: ["comedy-movies"], queryFn: () => getByGenre(GENRE_IDS.comedy, "movie") });
  const sciFi = useQuery({ queryKey: ["scifi-movies"], queryFn: () => getByGenre(GENRE_IDS.sciFi, "movie") });
  const horror = useQuery({ queryKey: ["horror-movies"], queryFn: () => getByGenre(GENRE_IDS.horror, "movie") });
  const popularSeries = useQuery({ queryKey: ["popular-series"], queryFn: () => getPopular("tv") });
  const crime = useQuery({ queryKey: ["crime-series"], queryFn: () => getByGenre(GENRE_IDS.crime, "tv") });
  const mystery = useQuery({ queryKey: ["mystery-series"], queryFn: () => getByGenre(GENRE_IDS.mystery, "tv") });
  const kDrama = useQuery({ queryKey: ["korean-dramas"], queryFn: () => getByLanguage("ko", "tv") });
  const jpSeries = useQuery({ queryKey: ["japanese-series"], queryFn: () => getByLanguage("ja", "tv") });
  const hiddenGems = useQuery({ queryKey: ["hidden-gems"], queryFn: () => getHiddenGems("movie") });

  // Jikan-powered anime rows
  const popularAnime = useQuery({ queryKey: ["popular-anime-jikan"], queryFn: () => getTopAnime() });
  const currentSeason = useQuery({ queryKey: ["current-season-anime"], queryFn: () => getCurrentSeasonAnime() });
  const upcomingAnime = useQuery({ queryKey: ["upcoming-anime"], queryFn: () => getUpcomingAnime() });

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
          Search movies or series…
        </button>
      </div>

      <div className="space-y-6">
        <ContinueWatchingRow />
        <MovieRow title="Trending Today" movies={trendingToday.data ?? []} isLoading={trendingToday.isLoading} slug="trending-today" />
        <MovieRow title="Picked For You" movies={pickedForYou.data ?? []} isLoading={pickedForYou.isLoading} mediaType="movie" slug="picked-for-you" />
        <MovieRow title="Popular This Week" movies={popularWeek.data ?? []} isLoading={popularWeek.isLoading} slug="popular-this-week" />
        <MovieRow title="Top Rated Movies" movies={topRated.data ?? []} isLoading={topRated.isLoading} mediaType="movie" slug="top-rated-movies" />
        <MovieRow title="Action Movies" movies={action.data ?? []} isLoading={action.isLoading} mediaType="movie" slug="action-movies" />
        <MovieRow title="Comedy Movies" movies={comedy.data ?? []} isLoading={comedy.isLoading} mediaType="movie" slug="comedy-movies" />
        <MovieRow title="Sci-Fi Movies" movies={sciFi.data ?? []} isLoading={sciFi.isLoading} mediaType="movie" slug="scifi-movies" />
        <MovieRow title="Horror Movies" movies={horror.data ?? []} isLoading={horror.isLoading} mediaType="movie" slug="horror-movies" />
        <MovieRow title="Popular Series" movies={popularSeries.data ?? []} isLoading={popularSeries.isLoading} mediaType="tv" slug="popular-series" />
        <MovieRow title="Crime Series" movies={crime.data ?? []} isLoading={crime.isLoading} mediaType="tv" slug="crime-series" />
        <MovieRow title="Mystery Series" movies={mystery.data ?? []} isLoading={mystery.isLoading} mediaType="tv" slug="mystery-series" />
        <MovieRow title="Popular Anime" movies={popularAnime.data ?? []} isLoading={popularAnime.isLoading} mediaType="anime" slug="popular-anime" />
        <MovieRow title="Current Season" movies={currentSeason.data ?? []} isLoading={currentSeason.isLoading} mediaType="anime" slug="current-season-anime" />
        <MovieRow title="Upcoming Anime" movies={upcomingAnime.data ?? []} isLoading={upcomingAnime.isLoading} mediaType="anime" slug="upcoming-anime" />
        <MovieRow title="Korean Dramas" movies={kDrama.data ?? []} isLoading={kDrama.isLoading} mediaType="tv" slug="korean-dramas" />
        <MovieRow title="Japanese Series" movies={jpSeries.data ?? []} isLoading={jpSeries.isLoading} mediaType="tv" slug="japanese-series" />
        <MovieRow title="Hidden Gems" movies={hiddenGems.data ?? []} isLoading={hiddenGems.isLoading} mediaType="movie" slug="hidden-gems" />
      </div>
    </div>
  );
};

export default HomePage;
