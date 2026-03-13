import type { Movie } from "@/data/movies";
import MovieCard from "./MovieCard";

interface MovieRowProps {
  title: string;
  movies: Movie[];
}

const MovieRow = ({ title, movies }: MovieRowProps) => {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-foreground px-4">{title}</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  );
};

export default MovieRow;
