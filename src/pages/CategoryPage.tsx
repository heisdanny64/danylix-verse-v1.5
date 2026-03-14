import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { CATEGORY_MAP } from "@/lib/tmdb";
import MovieCard from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";

const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const config = slug ? CATEGORY_MAP[slug] : undefined;

  const { data: movies, isLoading } = useQuery({
    queryKey: ["category", slug],
    queryFn: () => config!.fetchFn(),
    enabled: !!config,
  });

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Category not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-card flex items-center justify-center text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground">{config.title}</h1>
      </header>

      <div className="px-4 grid grid-cols-3 gap-3">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))
          : movies?.map((movie) => (
              <div key={movie.id} className="w-full">
                <MovieCard movie={movie} mediaType={config.mediaType} compact />
              </div>
            ))}
      </div>
    </div>
  );
};

export default CategoryPage;
