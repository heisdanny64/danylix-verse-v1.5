import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import MovieRow from "@/components/MovieRow";
import HeroBanner from "@/components/HeroBanner";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import {
  getTrending, getPopular, getTopRated, getByGenre, getByGenreAndLanguage,
  getByLanguage, getHiddenGems, getByOriginCountry, getUpcoming, GENRE_IDS, sortByFreshness,
} from "@/lib/tmdb";
import { getTrendingAnime, getPopularAnime, animeToCard } from "@/lib/anilist";

const HomePage = () => {
  const navigate = useNavigate();

  const hero = useQuery({ queryKey: ["trending-hero"], queryFn: () => getTrending("all", "day") });

  // Core rows
  const trendingToday = useQuery({ queryKey: ["trending-today"], queryFn: async () => sortByFreshness(await getTrending("all", "day")) });
  const popularMovies = useQuery({ queryKey: ["popular-movies"], queryFn: async () => sortByFreshness(await getPopular("movie")) });
  const popularSeries = useQuery({ queryKey: ["popular-series"], queryFn: () => getPopular("tv") });

  // Anime rows (AniList)
  const trendingAnime = useQuery({
    queryKey: ["trending-anime-anilist"],
    queryFn: async () => (await getTrendingAnime()).map(animeToCard),
  });
  const popularAnime = useQuery({
    queryKey: ["popular-anime-anilist"],
    queryFn: async () => (await getPopularAnime()).map(animeToCard),
  });

  // Global
  const nollywood = useQuery({ queryKey: ["nollywood"], queryFn: () => getByOriginCountry("NG", "tv") });
  const kDrama = useQuery({ queryKey: ["korean-dramas"], queryFn: () => getByLanguage("ko", "tv") });
  const cDrama = useQuery({ queryKey: ["chinese-dramas"], queryFn: () => getByLanguage("zh", "tv") });
  const thaiDrama = useQuery({ queryKey: ["thai-dramas"], queryFn: () => getByLanguage("th", "tv") });
  const saDrama = useQuery({ queryKey: ["south-african-drama"], queryFn: () => getByOriginCountry("ZA", "tv") });

  // Curated
  const romance = useQuery({ queryKey: ["romance"], queryFn: () => getByGenre(GENRE_IDS.romance, "movie") });
  const thriller = useQuery({ queryKey: ["thriller-mystery"], queryFn: () => getByGenre(GENRE_IDS.thriller, "movie") });
  const comedy = useQuery({ queryKey: ["comedy-movies"], queryFn: () => getByGenre(GENRE_IDS.comedy, "movie") });

  // For all users
  const animation = useQuery({ queryKey: ["animation-all"], queryFn: () => getByGenre(GENRE_IDS.animation, "movie") });
  const kidsTeens = useQuery({ queryKey: ["kids-teens"], queryFn: () => getByGenre(GENRE_IDS.family, "movie") });
  const documentaries = useQuery({ queryKey: ["documentaries"], queryFn: () => getByGenre(GENRE_IDS.documentary, "movie") });
  const sciFiFantasy = useQuery({ queryKey: ["scifi-fantasy"], queryFn: () => getByGenre(GENRE_IDS.sciFi, "movie") });

  // Discovery
  const upcoming = useQuery({ queryKey: ["upcoming-movies"], queryFn: () => getUpcoming() });
  const topRated = useQuery({ queryKey: ["top-rated-movies"], queryFn: () => getTopRated("movie") });
  const hiddenGems = useQuery({ queryKey: ["hidden-gems"], queryFn: () => getHiddenGems("movie") });

  return (
    <div className="pb-24 min-h-screen">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 px-4 pt-6 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">
          <span className="text-foreground">D.</span>
          <span className="text-primary">Verse</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Danylix Verse</p>
      </header>

      <HeroBanner movies={hero.data ?? []} />

      {/* Search */}
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
        <ContinueWatchingRow />

        {/* Core */}
        <MovieRow title="Trending Now" movies={trendingToday.data ?? []} isLoading={trendingToday.isLoading} slug="trending-today" />
        <MovieRow title="Popular Movies" movies={popularMovies.data ?? []} isLoading={popularMovies.isLoading} mediaType="movie" slug="popular-movies" />
        <MovieRow title="Popular TV Shows" movies={popularSeries.data ?? []} isLoading={popularSeries.isLoading} mediaType="tv" slug="popular-series" />

        {/* Anime */}
        <MovieRow title="Trending Anime" movies={trendingAnime.data ?? []} isLoading={trendingAnime.isLoading} mediaType="anime" />
        <MovieRow title="Popular Anime" movies={popularAnime.data ?? []} isLoading={popularAnime.isLoading} mediaType="anime" />

        {/* Global */}
        <MovieRow title="Nollywood" movies={nollywood.data ?? []} isLoading={nollywood.isLoading} mediaType="tv" slug="nollywood" />
        <MovieRow title="K-Drama" movies={kDrama.data ?? []} isLoading={kDrama.isLoading} mediaType="tv" slug="korean-dramas" />
        <MovieRow title="C-Drama" movies={cDrama.data ?? []} isLoading={cDrama.isLoading} mediaType="tv" slug="chinese-dramas" />
        <MovieRow title="Thai Drama" movies={thaiDrama.data ?? []} isLoading={thaiDrama.isLoading} mediaType="tv" slug="thai-dramas" />
        <MovieRow title="South African Drama" movies={saDrama.data ?? []} isLoading={saDrama.isLoading} mediaType="tv" slug="south-african-drama" />

        {/* Curated */}
        <MovieRow title="Romance" movies={romance.data ?? []} isLoading={romance.isLoading} mediaType="movie" slug="romance" />
        <MovieRow title="Thriller & Mystery" movies={thriller.data ?? []} isLoading={thriller.isLoading} mediaType="movie" slug="thriller-mystery" />
        <MovieRow title="Comedy" movies={comedy.data ?? []} isLoading={comedy.isLoading} mediaType="movie" slug="comedy-movies" />

        {/* For All Users */}
        <MovieRow title="Animation" movies={animation.data ?? []} isLoading={animation.isLoading} mediaType="movie" slug="animation" />
        <MovieRow title="Kids & Teens" movies={kidsTeens.data ?? []} isLoading={kidsTeens.isLoading} mediaType="movie" slug="kids-teens" />
        <MovieRow title="Documentaries" movies={documentaries.data ?? []} isLoading={documentaries.isLoading} mediaType="movie" slug="documentaries" />
        <MovieRow title="Sci-Fi & Fantasy" movies={sciFiFantasy.data ?? []} isLoading={sciFiFantasy.isLoading} mediaType="movie" slug="scifi-fantasy" />

        {/* Discovery */}
        <MovieRow title="Upcoming" movies={upcoming.data ?? []} isLoading={upcoming.isLoading} mediaType="movie" slug="upcoming" />
        <MovieRow title="Top Rated" movies={topRated.data ?? []} isLoading={topRated.isLoading} mediaType="movie" slug="top-rated-movies" />
        <MovieRow title="Hidden Gems" movies={hiddenGems.data ?? []} isLoading={hiddenGems.isLoading} mediaType="movie" slug="hidden-gems" />
      </div>
    </div>
  );
};

export default HomePage;
