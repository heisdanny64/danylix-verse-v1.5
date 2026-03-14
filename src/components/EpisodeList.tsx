import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { getSeasonDetails, posterUrl, type TMDBEpisode } from "@/lib/tmdb";
import { Skeleton } from "@/components/ui/skeleton";

interface EpisodeListProps {
  tvId: number;
  seasonNumber: number;
  onPlayEpisode: (episode: TMDBEpisode) => void;
}

const EpisodeList = ({ tvId, seasonNumber, onPlayEpisode }: EpisodeListProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["season", tvId, seasonNumber],
    queryFn: () => getSeasonDetails(tvId, seasonNumber),
  });

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
