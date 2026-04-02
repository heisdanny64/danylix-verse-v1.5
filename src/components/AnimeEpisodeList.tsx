import { Play } from "lucide-react";

interface AnimeEpisodeListProps {
  animeId: number;
  seasonNumber: number;
  totalEpisodes: number;
  onPlayEpisode: (season: number, episode: number) => void;
}

const AnimeEpisodeList = ({ animeId, seasonNumber, totalEpisodes, onPlayEpisode }: AnimeEpisodeListProps) => {
  if (totalEpisodes <= 0) {
    return <p className="text-sm text-muted-foreground py-2">No episode data available.</p>;
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 py-2">
      {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
        <button
          key={ep}
          onClick={() => onPlayEpisode(seasonNumber, ep)}
          className="flex items-center justify-center gap-1 rounded-lg bg-card p-3 text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Play className="w-3 h-3" />
          E{ep}
        </button>
      ))}
    </div>
  );
};

export default AnimeEpisodeList;
