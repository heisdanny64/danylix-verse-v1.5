import { Link } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TMDBMovie } from "@/lib/tmdb";
import MovieCard from "./MovieCard";
import { Skeleton } from "@/components/ui/skeleton";

interface MovieRowProps {
  title: string;
  movies: TMDBMovie[];
  isLoading?: boolean;
  mediaType?: "movie" | "tv";
  slug?: string;
  variant?: "portrait" | "landscape";
  /** Override card link path. Receives the movie, returns an href. */
  hrefFor?: (movie: TMDBMovie) => string;
}

const MovieRow = ({ title, movies, isLoading, mediaType, slug, variant = "portrait", hrefFor }: MovieRowProps) => {
  const isLandscape = variant === "landscape";
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [movies, isLoading]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {slug && (
          <Link to={`/category/${slug}`} className="flex items-center gap-0.5 text-xs text-primary font-medium">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      <div className="relative group">
        <div ref={scrollerRef} className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide scroll-smooth">
          {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0" style={{ width: isLandscape ? "clamp(220px, 60vw, 320px)" : "clamp(130px, 22vw, 220px)" }}>
                <Skeleton className={isLandscape ? "aspect-video rounded-lg" : "aspect-[2/3] rounded-lg"} />
              </div>
            ))
          : movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} mediaType={mediaType} variant={variant} hrefFor={hrefFor} />
            ))}
        </div>
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className={`hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border items-center justify-center text-foreground transition-opacity ${canLeft ? "opacity-90 hover:opacity-100" : "opacity-0 pointer-events-none"}`}
        ><ChevronLeft className="w-5 h-5" /></button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className={`hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border items-center justify-center text-foreground transition-opacity ${canRight ? "opacity-90 hover:opacity-100" : "opacity-0 pointer-events-none"}`}
        ><ChevronRight className="w-5 h-5" /></button>
      </div>
    </section>
  );
};

export default MovieRow;
