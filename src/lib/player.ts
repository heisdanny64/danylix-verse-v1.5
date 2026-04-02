export interface Channel {
  id: number;
  name: string;
  label: string;
  disabled: boolean;
  disabledForAnime?: boolean;
  type: "hls" | "iframe";
  sandbox: string;
  allow: string;
  getUrl: (type: "movie" | "tv" | "anime", tmdbId: number, season?: number, episode?: number, subDub?: "sub" | "dub") => string;
}

export const CHANNELS: Channel[] = [
  {
    id: 1,
    name: "Channel 1",
    label: "Cinetaro",
    disabled: false,
    type: "hls",
    sandbox: "",
    allow: "autoplay; encrypted-media; fullscreen; picture-in-picture",
    getUrl: (type, id, season, episode, subDub = "sub") => {
      if (type === "anime") {
        return `https://apicinetaro.falex43350.workers.dev/anime/${id}/${season || 1}/${episode || 1}/${subDub}`;
      }
      if (type === "tv" && season && episode) {
        return `https://apicinetaro.falex43350.workers.dev/tv/${id}/${season}/${episode}/english`;
      }
      return `https://apicinetaro.falex43350.workers.dev/movie/${id}/english`;
    },
  },
  {
    id: 2,
    name: "Channel 2",
    label: "VidLink",
    disabled: false,
    disabledForAnime: true,
    type: "iframe",
    sandbox: "",
    allow: "autoplay; encrypted-media; fullscreen; picture-in-picture",
    getUrl: (type, id, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://vidlink.pro/tv/${id}/${season}/${episode}`;
      }
      return `https://vidlink.pro/movie/${id}`;
    },
  },
  {
    id: 3,
    name: "Channel 3",
    label: "SuperEmbed",
    disabled: false,
    disabledForAnime: true,
    type: "iframe",
    sandbox: "",
    allow: "autoplay; encrypted-media; fullscreen; picture-in-picture",
    getUrl: (type, id, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
      }
      return `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`;
    },
  },
];
