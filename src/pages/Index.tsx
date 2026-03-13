import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import MovieRow from "@/components/MovieRow";
import { getTrending, getPopular, getByGenre, GENRE_IDS } from "@/lib/tmdb";

const HomePage = () => {
  const navigate = useNavigate();

  const trendingMovies = useQuery({ queryKey: ["trending", "movie"], queryFn: () => getTrending("movie") });
  const trendingSeries = useQuery({ queryKey: ["trending", "tv"], queryFn: () => getTrending("tv") });
  const anime = useQuery({ queryKey: ["anime"], queryFn: () => getByGenre(GENRE_IDS.animation) });
  const action = useQuery({ queryKey: ["action"], queryFn: () => getByGenre(GENRE_IDS.action) });

  return (
    <div className="pb-24 min-h-screen">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">
          <span className="text-foreground">D.</span>
          <span className="text-primary">Verse</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Danylix Verse</p>
      </header>

      <div className="px-4 mb-6">
        <button
          onClick={() => navigate("/search")}
          className="flex w-full items-center gap-3 rounded-lg bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          <Search className="w-4 h-4 text-primary" />
          Search movies or series…
        </button>
      </div>

      <div className="space-y-6">
        <MovieRow title="Trending Movies" movies={trendingMovies.data ?? []} isLoading={trendingMovies.isLoading} mediaType="movie" />
        <MovieRow title="Trending Series" movies={trendingSeries.data ?? []} isLoading={trendingSeries.isLoading} mediaType="tv" />
        <MovieRow title="Popular Anime" movies={anime.data ?? []} isLoading={anime.isLoading} mediaType="movie" />
        <MovieRow title="Action Movies" movies={action.data ?? []} isLoading={action.isLoading} mediaType="movie" />
      </div>
    </div>
  );
};

export default HomePage;
