const ANILIST_URL = "https://graphql.anilist.co";

export interface AnimeSeason {
  id: number;
  title: string;
  seasonNumber: number;
  episodes: number;
}

export interface AnimeItem {
  id: number;
  title: string;
  description: string;
  poster: string;
  banner: string | null;
  type: "anime";
  episodes: number;
  rating: number;
  year: number | null;
  genres: string[];
  status: string;
  seasons: AnimeSeason[];
}

interface AniListMedia {
  id: number;
  title: { romaji: string; english: string | null };
  description: string | null;
  coverImage: { large: string; extraLarge?: string };
  bannerImage: string | null;
  episodes: number | null;
  averageScore: number | null;
  seasonYear: number | null;
  genres: string[];
  status: string;
  relations?: {
    edges: {
      relationType: string;
      node: {
        id: number;
        title: { romaji: string; english: string | null };
        episodes: number | null;
        format: string;
        status: string;
      };
    }[];
  };
}

const MEDIA_FRAGMENT = `
  id
  title { romaji english }
  description
  coverImage { large extraLarge }
  bannerImage
  episodes
  averageScore
  seasonYear
  genres
  status
`;

const DETAIL_FRAGMENT = `
  ${MEDIA_FRAGMENT}
  relations {
    edges {
      relationType
      node {
        id
        title { romaji english }
        episodes
        format
        status
      }
    }
  }
`;

async function anilistFetch<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "AniList query error");
  return json.data;
}

function normalizeMedia(m: AniListMedia): AnimeItem {
  const seasons = buildSeasons(m);
  return {
    id: m.id,
    title: m.title.english || m.title.romaji,
    description: m.description?.replace(/<[^>]*>/g, "") || "",
    poster: m.coverImage.extraLarge || m.coverImage.large,
    banner: m.bannerImage,
    type: "anime",
    episodes: m.episodes || 0,
    rating: (m.averageScore || 0) / 10,
    year: m.seasonYear,
    genres: m.genres || [],
    status: m.status || "UNKNOWN",
    seasons,
  };
}

function buildSeasons(m: AniListMedia): AnimeSeason[] {
  const sequels =
    m.relations?.edges
      ?.filter(
        (e) =>
          e.relationType === "SEQUEL" &&
          (e.node.format === "TV" || e.node.format === "TV_SHORT")
      )
      .map((e) => e.node) || [];

  if (sequels.length === 0) {
    return [
      {
        id: m.id,
        title: m.title.english || m.title.romaji,
        seasonNumber: 1,
        episodes: m.episodes || 0,
      },
    ];
  }

  const allSeasons: AnimeSeason[] = [
    {
      id: m.id,
      title: m.title.english || m.title.romaji,
      seasonNumber: 1,
      episodes: m.episodes || 0,
    },
    ...sequels.map((s, i) => ({
      id: s.id,
      title: s.title.english || s.title.romaji,
      seasonNumber: i + 2,
      episodes: s.episodes || 0,
    })),
  ];

  return allSeasons;
}

export async function getTrendingAnime(page = 1, perPage = 20): Promise<AnimeItem[]> {
  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(`
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `, { page, perPage });
  return data.Page.media.map(normalizeMedia);
}

export async function getPopularAnime(page = 1, perPage = 20): Promise<AnimeItem[]> {
  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(`
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `, { page, perPage });
  return data.Page.media.map(normalizeMedia);
}

export async function searchAniList(query: string, perPage = 20): Promise<AnimeItem[]> {
  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(`
    query ($search: String, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, search: $search, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `, { search: query, perPage });
  return data.Page.media.map(normalizeMedia);
}

export async function getAnimeDetails(id: number): Promise<AnimeItem> {
  const data = await anilistFetch<{ Media: AniListMedia }>(`
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${DETAIL_FRAGMENT}
      }
    }
  `, { id });
  return normalizeMedia(data.Media);
}

// Convert AnimeItem to TMDBMovie-compatible shape for MovieCard/MovieRow
export function animeToCard(anime: AnimeItem) {
  return {
    id: anime.id,
    title: anime.title,
    overview: anime.description,
    poster_path: anime.poster, // full URL, handled specially in MovieCard
    backdrop_path: anime.banner,
    vote_average: anime.rating,
    release_date: anime.year ? `${anime.year}-01-01` : "",
    genre_ids: [],
    media_type: "anime" as const,
    _isAnimeCard: true as const, // marker for MovieCard to use full poster URL
  };
}
