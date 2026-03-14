export interface Channel {
  id: number;
  name: string;
  getUrl: (type: "movie" | "tv", tmdbId: number, season?: number, episode?: number) => string;
}

export const CHANNELS: Channel[] = [
  {
    id: 1,
    name: "Channel 1",
    getUrl: (type, tmdbId, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`;
      }
      return `https://vidsrc.xyz/embed/${type}/${tmdbId}`;
    },
  },
  {
    id: 2,
    name: "Channel 2",
    getUrl: (type, tmdbId, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;
      }
      return `https://vidsrc.to/embed/${type}/${tmdbId}`;
    },
  },
  {
    id: 3,
    name: "Channel 3",
    getUrl: (type, tmdbId, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`;
      }
      return `https://2embed.cc/embed/${tmdbId}`;
    },
  },
];
