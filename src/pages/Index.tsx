import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import MovieRow from "@/components/MovieRow";
import HeroBanner from "@/components/HeroBanner";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import {
  getTrending, getPopular, getTopRated, getByGenre, getByLanguage,
  getHiddenGems, GENRE_IDS, sortByFreshness, getByGenreAndLanguage,
} from "@/lib/tmdb";
import { getTopAnime, getCurrentSeasonAnime, getUpcomingAnime } from "@/lib/jikan";

const HomePage = () => {
  const navigate = useNavigate();

  const hero = useQuery({ queryKey: ["trending-hero"], queryFn: () => getTrending("all", "day") });
  const trendingToday = useQuery({ queryKey: ["trending-today"], queryFn: async () => sortByFreshness(await getTrending("all", "day")) });

  // Anime rows (Jikan)
  const trendingAnime = useQuery({ queryKey: ["popular-anime-jikan"], queryFn: () => getTopAnime() });
  const popularAnime = useQuery({ queryKey: ["current-season-anime"], queryFn: () => getCurrentSeasonAnime() });
  const seasonalAnime = useQuery({ queryKey: ["upcoming-anime"], queryFn: () => getUpcomingAnime() });

  // Movie/TV rows (TMDB)
  const popularMovies = useQuery({ queryKey: ["popular-movies"], queryFn: async () => sortByFreshness(await getPopular("movie")) });
  const popularTV = useQuery({ queryKey: ["popular-tv"], queryFn: () => getPopular("tv") });

  // Regional/genre rows
  const nollywood = useQuery({ queryKey: ["nollywood"], queryFn: () => getByLanguage("yo", "movie") });
  const kDrama = useQuery({ queryKey: ["korean-dramas"], queryFn: () => getByLanguage("ko", "tv") });
  const cDrama = useQuery({ queryKey: ["chinese-dramas"], queryFn: () => getByLanguage("zh", "tv") });
  const thaiDrama = useQuery({ queryKey: ["thai-dramas"], queryFn: () => getByLanguage("th", "tv") });
  const southAfrican = useQuery({ queryKey: ["south-african"], queryFn: () => getByLanguage("zu", "tv") });
  const blackShows = useQuery({ queryKey: ["black-shows"], queryFn: () => getByGenreAndLanguage(GENRE_IDS.drama, "en", "tv") });
  const shortSeries = useQuery({ queryKey: ["short-series"], queryFn: () => getByGenre(GENRE_IDS.drama, "tv") });

  const action = useQuery({ queryKey: ["action-movies"], queryFn: () => getByGenre(GENRE_IDS.action, "movie") });
  const comedy = useQuery({ queryKey: ["comedy-movies"], queryFn: () => getByGenre(GENRE_IDS.comedy, "movie") });
  const sciFi = useQuery({ queryKey: ["scifi-movies"], queryFn: () => getByGenre(GENRE_IDS.sciFi, "movie") });
  const horror = useQuery({ queryKey: ["horror-movies"], queryFn: () => getByGenre(GENRE_IDS.horror, "movie") });
  const hiddenGems = useQuery({ queryKey: ["hidden-gems"], queryFn: () => getHiddenGems("movie") });

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
        <MovieRow title="Trending Now" movies={trendingToday.data ?? []} isLoading={trendingToday.isLoading} slug="trending-today" />
        <MovieRow title="Trending Anime" movies={trendingAnime.data ?? []} isLoading={trendingAnime.isLoading} mediaType="anime" slug="popular-anime" />
        <MovieRow title="Popular Movies" movies={popularMovies.data ?? []} isLoading={popularMovies.isLoading} mediaType="movie" slug="picked-for-you" />
        <MovieRow title="Popular Anime" movies={popularAnime.data ?? []} isLoading={popularAnime.isLoading} mediaType="anime" slug="current-season-anime" />
        <MovieRow title="Top Rated TV" movies={popularTV.data ?? []} isLoading={popularTV.isLoading} mediaType="tv" slug="popular-series" />
        <MovieRow title="Nollywood Picks" movies={nollywood.data ?? []} isLoading={nollywood.isLoading} mediaType="movie" slug="nollywood" />
        <MovieRow title="K-Drama Hits" movies={kDrama.data ?? []} isLoading={kDrama.isLoading} mediaType="tv" slug="korean-dramas" />
        <MovieRow title="C-Drama Picks" movies={cDrama.data ?? []} isLoading={cDrama.isLoading} mediaType="tv" slug="chinese-dramas" />
        <MovieRow title="Thai Drama" movies={thaiDrama.data ?? []} isLoading={thaiDrama.isLoading} mediaType="tv" slug="thai-dramas" />
        <MovieRow title="South African Drama" movies={southAfrican.data ?? []} isLoading={southAfrican.isLoading} mediaType="tv" slug="south-african" />
        <MovieRow title="Must Watch Black Shows" movies={blackShows.data ?? []} isLoading={blackShows.isLoading} mediaType="tv" slug="black-shows" />
        <MovieRow title="Hot Short Series" movies={shortSeries.data ?? []} isLoading={shortSeries.isLoading} mediaType="tv" slug="short-series" />
        <MovieRow title="Seasonal Anime" movies={seasonalAnime.data ?? []} isLoading={seasonalAnime.isLoading} mediaType="anime" slug="upcoming-anime" />
        <MovieRow title="Action Movies" movies={action.data ?? []} isLoading={action.isLoading} mediaType="movie" slug="action-movies" />
        <MovieRow title="Comedy Movies" movies={comedy.data ?? []} isLoading={comedy.isLoading} mediaType="movie" slug="comedy-movies" />
        <MovieRow title="Sci-Fi Movies" movies={sciFi.data ?? []} isLoading={sciFi.isLoading} mediaType="movie" slug="scifi-movies" />
        <MovieRow title="Horror Movies" movies={horror.data ?? []} isLoading={horror.isLoading} mediaType="movie" slug="horror-movies" />
        <MovieRow title="Hidden Gems" movies={hiddenGems.data ?? []} isLoading={hiddenGems.isLoading} mediaType="movie" slug="hidden-gems" />
      </div>
    </div>
  );
};

export default HomePage;
