import { movies } from "@/data/movies";
import MovieCard from "@/components/MovieCard";

const RecommendationsPage = () => {
  // Shuffle and pick 12 as "recommended"
  const recommended = [...movies].sort(() => 0.5 - Math.random()).slice(0, 12);

  return (
    <div className="min-h-screen pb-24">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground">Recommended for You</h1>
        <p className="text-xs text-muted-foreground mt-1">Personalized picks based on your taste</p>
      </header>

      <div className="px-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {recommended.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
};

export default RecommendationsPage;
