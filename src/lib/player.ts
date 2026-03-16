export interface Channel {
  id: number;
  name: string;
  label: string;
  disabled: boolean;
  sandbox: string;
  allow: string;
  getUrl: (type: "movie" | "tv", tmdbId: number, season?: number, episode?: number) => string;
}

export const CHANNELS: Channel[] = [
  {
    id: 1,
    name: "Channel 1",
    label: "Channel 1",
    disabled: false,
    sandbox: "allow-scripts allow-same-origin allow-forms allow-popups",
    allow: "autoplay; encrypted-media; fullscreen; picture-in-picture",
    getUrl: (type, tmdbId, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://vidsrc-embed.ru/embed/tv/${tmdbId}/${season}/${episode}`;
      }
      return `https://vidsrc-embed.ru/embed/movie/${tmdbId}`;
    },
  },
  {
    id: 2,
    name: "Channel 2",
    label: "Channel 2",
    disabled: false,
    sandbox: "",
    allow: "autoplay; encrypted-media; fullscreen; picture-in-picture",
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
    sandbox: "",
    allow: "",
    getUrl: () => "",
  },
];
