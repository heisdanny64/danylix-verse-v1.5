import { Play } from "lucide-react";
import type { MovieBoxSeason } from "@/services/moviebox";

interface EpisodeListProps {
  season: MovieBoxSeason;
  onPlay: (se: number, ep: number) => void;
}

const EpisodeList = ({ season, onPlay }: EpisodeListProps) => {
  const count = season.episodesAvailable || season.totalEpisode || season.episodes.length;
  const episodes =
    season.episodes.length > 0
      ? season.episodes
      : Array.from({ length: count }, (_, i) => ({ episode: i + 1, title: null, releaseDate: null }));

  if (!episodes.length) {
    return <p className="text-sm text-muted-foreground">No episodes available.</p>;
  }

  return (
    <div className="space-y-2">
      {episodes.map((ep) => (
        <button
          key={ep.episode}
          onClick={() => onPlay(season.season, ep.episode)}
          className="flex w-full items-center gap-3 rounded-lg bg-card px-3 py-3 text-left transition-colors hover:bg-muted"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
            {ep.episode}
          </span>
          <span className="flex-1 truncate text-sm text-foreground">
            {ep.title || `Episode ${ep.episode}`}
          </span>
          <Play className="h-4 w-4 flex-shrink-0 fill-current text-muted-foreground" />
        </button>
      ))}
    </div>
  );
};

export default EpisodeList;
