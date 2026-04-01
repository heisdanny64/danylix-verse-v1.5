export interface Channel {
  id: number;
  name: string;
  label: string;
  disabled: boolean;
  type: "hls" | "iframe";
  sandbox: string;
  allow: string;
  getUrl: (type: "movie" | "tv", tmdbId: number, season?: number, episode?: number) => string;
}

export const CHANNELS: Channel[] = [
  {
    id: 1,
    name: "Channel 1",
    label: "Cinetaro",
    disabled: false,
    type: "iframe",
    sandbox: "",
    allow: "autoplay; encrypted-media; fullscreen; picture-in-picture",
    getUrl: (type, tmdbId, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://apicinetaro.falex43350.workers.dev/tv/${tmdbId}/${season}/${episode}/english`;
      }
      return `https://apicinetaro.falex43350.workers.dev/movie/${tmdbId}/english`;
    },
  },
  {
    id: 2,
    name: "Channel 2",
    label: "VidLink",
    disabled: false,
    type: "iframe",
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
    type: "iframe",
    sandbox: "",
    allow: "",
    getUrl: () => "",
  },
];
