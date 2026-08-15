import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import MovieCard from "./MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { MovieBoxSubject } from "@/services/moviebox";

interface MovieRowProps {
  title: string;
  subjects: MovieBoxSubject[];
  isLoading?: boolean;
  variant?: "portrait" | "landscape";
}

const MovieRow = ({ title, subjects, isLoading, variant = "portrait" }: MovieRowProps) => {
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
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [subjects, isLoading]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (!isLoading && !subjects.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      <div className="group relative">
        <div
          ref={scrollerRef}
          className="scrollbar-hide flex gap-3 overflow-x-auto scroll-smooth px-4 pb-2"
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0"
                  style={{ width: isLandscape ? "clamp(220px, 60vw, 320px)" : "clamp(130px, 22vw, 220px)" }}
                >
                  <Skeleton className={isLandscape ? "aspect-video rounded-xl" : "aspect-[2/3] rounded-xl"} />
                </div>
              ))
            : subjects.map((s) => <MovieCard key={s.subjectId} subject={s} variant={variant} />)}
        </div>
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className={`absolute left-1 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 text-foreground transition-opacity hover:bg-background md:flex ${canLeft ? "opacity-90 hover:opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className={`absolute right-1 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 text-foreground transition-opacity hover:bg-background md:flex ${canRight ? "opacity-90 hover:opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
};

export default MovieRow;
