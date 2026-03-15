export interface Channel {
  id: number;
  name: string;
  label: string;
  disabled: boolean;
  getUrl: (type: "movie" | "tv", tmdbId: number, season?: number, episode?: number) => string;
}

export const CHANNELS: Channel[] = [
  {
    id: 1,
    name: "Channel 1",
    label: "Channel 1",
    disabled: false,
    getUrl: (type, tmdbId, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
      }
      return `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`;
    },
  },
  {
    id: 2,
    name: "Channel 2",
    label: "Channel 2",
    disabled: false,
    getUrl: (type, tmdbId, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`;
      }
      return `https://vidlink.pro/movie/${tmdbId}`;
    },
  },
  {
    id: 3,
    name: "Channel 3",
    label: "Coming Soon",
    disabled: true,
    getUrl: () => "",
  },
];
