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
  getTMDBAnimeCandidates,
  sortByFreshness, excludeAnime, limitAnime,
  type TMDBMovie,
} from "@/lib/tmdb";
import { filterVerifiedAnime } from "@/lib/animeVerify";
import { getNollywoodFromGifted } from "@/services/giftedApi";
import { mediaToTmdbCard } from "@/lib/media";

const HomePage = () => {
  const navigate = useNavigate();

  const hero = useQuery({
    queryKey: ["trending-hero"],
    queryFn: () => getTrending("all", "day"),
  });

  const trendingNow = useQuery({
    queryKey: ["trending-now"],
    queryFn: async () => sortByFreshness(await getTrending("all", "day")),
  });

  const trendingIds = useMemo(() => {
    const ids = new Set<number>();
    trendingNow.data?.forEach((m) => ids.add(m.id));
    return ids;
  }, [trendingNow.data]);

  const trendingMovies = useQuery({
    queryKey: ["trending-movies"],
    queryFn: () => getTrendingMovies(),
  });

  const trendingSeries = useQuery({
    queryKey: ["trending-series"],
    queryFn: () => getTrendingSeries(),
  });

  const dedupedMovies = useMemo(
    () => trendingMovies.data?.filter((m) => !trendingIds.has(m.id)) ?? [],
    [trendingMovies.data, trendingIds]
  );

  const dedupedSeries = useMemo(
    () => trendingSeries.data?.filter((m) => !trendingIds.has(m.id)) ?? [],
    [trendingSeries.data, trendingIds]
  );

  const anime = useQuery({
    queryKey: ["anime-tmdb-verified"],
    queryFn: async () => {
      const candidates = await getTMDBAnimeCandidates();
      return filterVerifiedAnime(candidates);
    },
    staleTime: 30 * 60 * 1000,
  });

  const nollywood = useQuery({
    queryKey: ["nollywood-gifted"],
    queryFn: async () =>
      (await getNollywoodFromGifted()).map(mediaToTmdbCard) as TMDBMovie[],
    staleTime: 15 * 60 * 1000,
  });

  const animation = useQuery({
    queryKey: ["animation"],
    queryFn: async () => excludeAnime(await getAnimation()),
  });

  const kidsTeens = useQuery({
    queryKey: ["kids-teens"],
    queryFn: async () => excludeAnime(await getKidsTeens()),
  });

  const globalHits = useQuery({
    queryKey: ["global-hits"],
    queryFn: async () => limitAnime(await getGlobalHits(), 0.2),
  });

  const koreanDrama = useQuery({
    queryKey: ["korean-dramas"],
    queryFn: () => getKoreanDrama(),
  });

  const japaneseShows = useQuery({
    queryKey: ["japanese-shows"],
    queryFn: async () => excludeAnime(await getJapaneseShows()),
  });

  const blackStories = useQuery({
    queryKey: ["black-stories"],
    queryFn: () => getBlackStories(),
  });

  const action = useQuery({
    queryKey: ["action"],
    queryFn: async () => excludeAnime(await getAction()),
  });

  const romanceDrama = useQuery({
    queryKey: ["romance-drama"],
    queryFn: async () => excludeAnime(await getRomanceDrama()),
  });

  const comedy = useQuery({
    queryKey: ["comedy"],
    queryFn: async () => excludeAnime(await getComedy()),
  });

  const horror = useQuery({
    queryKey: ["horror"],
    queryFn: async () => excludeAnime(await getHorror()),
  });

  return (
    <div className="min-h-screen pb-24">
      <HeroBanner movies={hero.data ?? []} />

      <div className="px-4 my-4 md:hidden">
        <button
          onClick={() => navigate("/search")}
          className="flex w-full items-center gap-3 rounded-lg bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          <Search className="w-4 h-4 text-primary" />
          Search movies, series, or anime…
        </button>
      </div>

      <div className="space-y-6">
        <MovieRow title="Trending Now" movies={trendingNow.data ?? []} isLoading={trendingNow.isLoading} slug="trending-today" />
        <ContinueWatchingRow />
        <MovieRow title="Trending Movies" movies={dedupedMovies} isLoading={trendingMovies.isLoading} mediaType="movie" slug="trending-movies" />
        <MovieRow title="Trending Series" movies={dedupedSeries} isLoading={trendingSeries.isLoading} mediaType="tv" slug="trending-series" />
        <MovieRow title="Anime" movies={anime.data ?? []} isLoading={anime.isLoading} mediaType="tv" slug="anime" />
        <MovieRow title="Nollywood Hits" movies={nollywood.data ?? []} isLoading={nollywood.isLoading} variant="landscape" />
        <MovieRow title="Animation" movies={animation.data ?? []} isLoading={animation.isLoading} slug="animation" />
        <MovieRow title="Kids & Teens" movies={kidsTeens.data ?? []} isLoading={kidsTeens.isLoading} mediaType="tv" slug="kids-teens" />
        <MovieRow title="Global Hits" movies={globalHits.data ?? []} isLoading={globalHits.isLoading} mediaType="movie" slug="global-hits" />
        <MovieRow title="Korean Drama" movies={koreanDrama.data ?? []} isLoading={koreanDrama.isLoading} mediaType="tv" slug="korean-dramas" />
        <MovieRow title="Japanese Shows" movies={japaneseShows.data ?? []} isLoading={japaneseShows.isLoading} mediaType="tv" slug="japanese-shows" />
        <MovieRow title="Black Stories" movies={blackStories.data ?? []} isLoading={blackStories.isLoading} mediaType="movie" slug="black-stories" />
        <MovieRow title="Action & Adventure" movies={action.data ?? []} isLoading={action.isLoading} mediaType="movie" slug="action" />
        <MovieRow title="Romance & Drama" movies={romanceDrama.data ?? []} isLoading={romanceDrama.isLoading} mediaType="movie" slug="romance-drama" />
        <MovieRow title="Comedy & Feel-Good" movies={comedy.data ?? []} isLoading={comedy.isLoading} mediaType="movie" slug="comedy" />
        <MovieRow title="Horror" movies={horror.data ?? []} isLoading={horror.isLoading} mediaType="movie" slug="horror" />
      </div>

      {/* ✅ SEO / OAuth SAFE FOOTER */}
      <footer className="px-4 pt-6 pb-6">
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground/70">
          <a
            href="/privacy"
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            Privacy
          </a>

          <span className="opacity-40">•</span>

          <a
            href="/terms"
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            Terms
          </a>
        </div>

        <p className="mt-3 text-center text-[10px] text-muted-foreground/40">
          © 2026 D. Verse
        </p>
      </footer>
    </div>
  );
};

export default HomePage;