export interface Channel {
  id: number;
  name: string;
  label: string;
  disabled: boolean;
  sandbox: string;
  allow: string;
  supportsAnime: boolean;
  getUrl: (type: "movie" | "tv" | "anime", id: number, season?: number, episode?: number, subDub?: "sub" | "dub") => string;
}

export const CHANNELS: Channel[] = [
  {
    id: 1,
    name: "Channel 1",
    label: "VidLink",
    disabled: false,
    sandbox: "",
    allow: "autoplay; encrypted-media; fullscreen; picture-in-picture; presentation",
    supportsAnime: true,
    getUrl: (type, id, season, episode, subDub) => {
      if (type === "anime") {
        return `https://vidlink.pro/anime/${id}/${episode || 1}/${subDub || "sub"}?fallback=true`;
      }
      if (type === "tv" && season && episode) {
        return `https://vidlink.pro/tv/${id}/${season}/${episode}`;
      }
      return `https://vidlink.pro/movie/${id}`;
    },
  },
  {
    id: 2,
    name: "Channel 2",
    label: "VidSrc",
    disabled: false,
    sandbox: "allow-scripts allow-same-origin allow-forms allow-presentation",
    allow: "autoplay; encrypted-media; fullscreen; picture-in-picture",
    supportsAnime: false,
    getUrl: (type, id, season, episode) => {
      if (type === "anime") return "";
      if (type === "tv" && season && episode) {
        return `https://vidsrc.xyz/embed/tv/${id}/${season}/${episode}`;
      }
      return `https://vidsrc.xyz/embed/movie/${id}`;
    },
  },
  {
    id: 3,
    name: "Channel 3",
    label: "Coming Soon",
    disabled: true,
    sandbox: "",
    allow: "",
    supportsAnime: false,
    getUrl: () => "",
  },
];
