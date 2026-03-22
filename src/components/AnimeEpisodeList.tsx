import { Play } from "lucide-react";

interface AnimeEpisodeListProps {
  totalEpisodes: number;
  onPlayEpisode: (episode: number) => void;
}

const AnimeEpisodeList = ({ totalEpisodes, onPlayEpisode }: AnimeEpisodeListProps) => {
  if (!totalEpisodes || totalEpisodes <= 0) {
    return <p className="text-sm text-muted-foreground py-2">No episode information available.</p>;
  }

  const episodes = Array.from({ length: totalEpisodes }, (_, i) => i + 1);

  return (
    <div className="space-y-2 py-2">
      {episodes.map((ep) => (
        <button
          key={ep}
          onClick={() => onPlayEpisode(ep)}
          className="flex items-center gap-3 w-full rounded-lg bg-card p-3 text-left hover:bg-muted transition-colors"
        >
          <div className="relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
            <Play className="w-5 h-5 text-primary fill-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Episode {ep}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default AnimeEpisodeList;
