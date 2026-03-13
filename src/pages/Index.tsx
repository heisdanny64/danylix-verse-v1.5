import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import MovieRow from "@/components/MovieRow";
import { getMoviesByCategory } from "@/data/movies";

const HomePage = () => {
  const navigate = useNavigate();

  const rows = [
    { title: "Trending Movies", key: "trending_movies" },
    { title: "Trending Series", key: "trending_series" },
    { title: "Popular Anime", key: "anime" },
    { title: "Action Movies", key: "action" },
  ];

  return (
    <div className="pb-24 min-h-screen">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">
          <span className="text-foreground">D.</span>
          <span className="text-primary">Verse</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Danylix Verse</p>
      </header>

      {/* Search Bar */}
      <div className="px-4 mb-6">
        <button
          onClick={() => navigate("/search")}
          className="flex w-full items-center gap-3 rounded-lg bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          <Search className="w-4 h-4 text-primary" />
          Search movies or series…
        </button>
      </div>

      {/* Movie Rows */}
      <div className="space-y-6">
        {rows.map(({ title, key }) => (
          <MovieRow key={key} title={title} movies={getMoviesByCategory(key)} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;
