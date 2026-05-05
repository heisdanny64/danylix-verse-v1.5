import { useQuery } from "@tanstack/react-query";
import { getCredits, posterUrl } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";

export interface CastRowItem {
  id: number | string;
  name: string;
  character?: string;
  profile_path?: string | null;
}

interface CastRowProps {
  id?: number;
  mediaType?: "movie" | "tv";
  cast?: CastRowItem[]; // when provided, skip TMDB fetch
}

const CastRow = ({ id, mediaType, cast }: CastRowProps) => {
  const useExternal = Array.isArray(cast);
  const { data: fetched, isLoading } = useQuery({
    queryKey: ["credits", mediaType, id],
    queryFn: () => getCredits(id!, mediaType!),
    enabled: !useExternal && !!id && !!mediaType,
    staleTime: 60 * 60 * 1000,
  });
  const data: CastRowItem[] | undefined = useExternal
    ? cast
    : (fetched as any);

  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-foreground px-4">Cast & Characters</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[88px]">
                <Skeleton className="h-[88px] w-[88px] rounded-full" />
                <Skeleton className="h-3 w-16 mt-2" />
                <Skeleton className="h-3 w-12 mt-1" />
              </div>
            ))
          : data!.map((c, i) => (
              <div key={String(c.id ?? i)} className="flex-shrink-0 w-[88px] text-center">
                <div className="h-[88px] w-[88px] rounded-full overflow-hidden bg-muted mx-auto">
                  {c.profile_path ? (
                    <img
                      src={/^https?:\/\//i.test(c.profile_path) ? c.profile_path : posterUrl(c.profile_path, "w185")}
                      alt={c.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                      {c.name?.[0] || "?"}
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-foreground mt-2 line-clamp-2">{c.name}</p>
                {c.character && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{c.character}</p>
                )}
              </div>
            ))}
      </div>
    </section>
  );
};

export default CastRow;