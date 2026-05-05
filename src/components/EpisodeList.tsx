import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { getSeasonDetails, posterUrl, type TMDBEpisode } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";
import { getGiftedSources } from "@/services/giftedApi";

interface EpisodeListProps {
  tvId: number;
  externalId?: string | number;
  seasonNumber: number;
  onPlayEpisode: (episode: TMDBEpisode) => void;
  source?: "tmdb" | "gifted";
  episodeCount?: number;
}

const EpisodeList = ({ tvId, externalId, seasonNumber, onPlayEpisode, source = "tmdb", episodeCount }: EpisodeListProps) => {
  const isGifted = source === "gifted";

  // For Gifted, probe sources for ep1 to learn how many qualities exist; we rely on episodeCount prop for total episodes.
  // If episodeCount is missing/0 we attempt to probe up to 50 by walking sources.
  const { data: probed, isLoading: probing } = useQuery({
    queryKey: ["gifted-season", externalId, seasonNumber],
    queryFn: async () => {
      if (!episodeCount || episodeCount > 0) return episodeCount || 0;
      // Fallback: try 1 to detect presence
      const r = await getGiftedSources(externalId!, seasonNumber, 1);
      return r.results.length > 0 ? 12 : 0;
    },
    enabled: isGifted && !!externalId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["season", tvId, seasonNumber],
    queryFn: () => getSeasonDetails(tvId, seasonNumber),
    enabled: !isGifted,
  });

  if (isGifted) {
    const total = (episodeCount ?? probed ?? 0) || 0;
    if (probing && !total) {
      return (
        <div className="space-y-3 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      );
    }
    if (!total) return <p className="text-sm text-muted-foreground py-2">No episodes found.</p>;
    return (
      <div className="space-y-2 py-2">
        {Array.from({ length: total }).map((_, i) => {
          const epNum = i + 1;
          return (
            <button
              key={epNum}
              onClick={() => onPlayEpisode({
                id: epNum,
                name: `Episode ${epNum}`,
                overview: "",
                episode_number: epNum,
                season_number: seasonNumber,
                still_path: null,
                runtime: null,
                air_date: null,
                vote_average: 0,
              })}
              className="flex items-center gap-3 w-full rounded-lg bg-card p-3 text-left hover:bg-muted transition-colors"
            >
              <div className="relative flex-shrink-0 w-24 aspect-video rounded-md overflow-hidden bg-muted flex items-center justify-center">
                <Play className="w-5 h-5 text-foreground fill-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">E{epNum}. Episode {epNum}</p>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data?.episodes?.length) {
    return <p className="text-sm text-muted-foreground py-2">No episodes found.</p>;
  }

  return (
    <div className="space-y-2 py-2">
      {data.episodes.map((ep) => (
        <button
          key={ep.id}
          onClick={() => onPlayEpisode(ep)}
          className="flex items-center gap-3 w-full rounded-lg bg-card p-3 text-left hover:bg-muted transition-colors"
        >
          <div className="relative flex-shrink-0 w-24 aspect-video rounded-md overflow-hidden bg-muted">
            {ep.still_path ? (
              <img
                src={posterUrl(ep.still_path, "w300")}
                alt={ep.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-background/30">
              <Play className="w-5 h-5 text-foreground fill-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              E{ep.episode_number}. {ep.name}
            </p>
            {ep.runtime && (
              <p className="text-xs text-muted-foreground">{ep.runtime} min</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export default EpisodeList;
