

# Anime Integration + Search Enhancement + Homepage Expansion Plan

## Scope
Add AniList-powered anime support across the app, enhance search with dual-source + filters, expand homepage rows, add SuperEmbed as Channel 3, and make DetailsPage/PlayerPage work for all content types — without breaking existing movie/TV functionality.

## Architecture Overview

```text
Content Types: "movie" | "tv" | "anime"

Data Sources:
  movie/tv → TMDB (existing)
  anime    → AniList GraphQL API

Streaming:
  movie/tv  → Ch1 Cinetaro, Ch2 VidLink, Ch3 SuperEmbed (auto-fallback)
  anime     → Ch1 Cinetaro anime endpoint ONLY (no fallback, no Ch2/Ch3)

Routing:
  /details/:type/:id  → unified DetailsPage (replaces /movie/:id and /series/:id)
  /player/:type/:id   → unified PlayerPage (already exists, extend for anime)
```

---

## Files to Create

### 1. `src/lib/anilist.ts` — AniList API layer

- AniList GraphQL endpoint: `https://graphql.anilist.co`
- Queries: trending (`TRENDING_DESC`), popular (`POPULARITY_DESC`), search, details with relations
- Normalize AniList data into a shared `AnimeItem` interface:
  ```ts
  interface AnimeItem {
    id: number;           // AniList ID
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
    seasons: AnimeSeason[];  // derived from SEQUEL/PREQUEL relations
  }
  ```
- Season grouping: use AniList `relations` (type SEQUEL) to chain related anime into seasons
- Export: `getTrendingAnime()`, `getPopularAnime()`, `searchAniList(query)`, `getAnimeDetails(id)`, `getAnimeRelations(id)`

### 2. `src/pages/DetailsPage.tsx` — Unified details page

- Replaces separate `MovieDetails` and `SeriesDetails` pages
- Route: `/details/:type/:id` where type = movie | tv | anime
- Behavior based on type:
  - **movie**: Fetch from TMDB. Show play button only. No episodes.
  - **tv**: Fetch from TMDB. Show seasons accordion with `EpisodeList` (existing component).
  - **anime**: Fetch from AniList via `getAnimeDetails()`.
    - If multiple seasons (from relations): show seasons dropdown, group episodes under each season
    - If single season: show episode list directly
    - Episodes generated from AniList `episodes` count (numbered list)
    - Play navigates to `/player/anime/${anilistId}?season=X&episode=Y`
- Visually consistent layout across all types (reuse backdrop, title, rating, genres, action buttons pattern)
- Watchlist/library actions work for all types

### 3. `src/components/AnimeEpisodeList.tsx` — Anime episode list component

- Takes: `animeId`, `seasonNumber`, `totalEpisodes`, `onPlayEpisode`
- Renders numbered episode buttons (E1, E2, ... En)
- No TMDB fetch — purely based on episode count from AniList

---

## Files to Modify

### 4. `src/lib/player.ts` — Add Channel 3 + anime channel type

- Extend `Channel.getUrl` signature to accept `type: "movie" | "tv" | "anime"` and optional `subDub`
- **Channel 1 (Cinetaro)**: Add anime URL:
  `https://apicinetaro.falex43350.workers.dev/anime/${id}/${season}/${episode}/${subOrDub}`
- **Channel 2 (VidLink)**: Keep as-is for movie/tv, mark `disabledForAnime: true`
- **Channel 3 (SuperEmbed)**: Enable with iframe type:
  - Movie: `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`
  - TV: `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${season}&e=${episode}`
  - Mark `disabledForAnime: true`
- Add `disabledForAnime?: boolean` to Channel interface

### 5. `src/pages/PlayerPage.tsx` — Support anime type

- Accept `type` = "movie" | "tv" | "anime"
- When type === "anime":
  - Use AniList ID directly (no TMDB fetch)
  - Fetch anime details from AniList for title display
  - Only show Channel 1; disable Channel 2 and 3 buttons
  - Show Sub/Dub toggle (true toggle switch UI, not buttons)
  - Sub/Dub state changes reload the player URL
  - No auto-fallback for anime
  - Season comes from search params, not defaulted to 1
- When type === "movie" or "tv":
  - Keep existing behavior
  - Add auto-fallback chain: Ch1 → Ch2 → Ch3 (7s timeout per channel)
  - Hide Sub/Dub toggle
- Episode navigation works for both tv and anime

### 6. `src/pages/SearchPage.tsx` — Dual-source search + filters

- Fetch from BOTH TMDB (`searchTMDB`) and AniList (`searchAniList`) in parallel
- Normalize all results into a common shape: `{ id, title, poster, type, year? }`
- Deduplicate: if a title exists in AniList results, remove matching TMDB results (match by normalized title)
- Add filter buttons: `[ALL] [MOVIES] [TV] [ANIME]`
- Filter logic filters the combined results by `type`
- `MovieCard` needs to handle `type: "anime"` for routing

### 7. `src/components/MovieCard.tsx` — Support anime type

- Accept `mediaType?: "movie" | "tv" | "anime"`
- When type is "anime": link to `/details/anime/${id}`
- When type is "movie": link to `/details/movie/${id}` (change from `/movie/movie-${id}`)
- When type is "tv": link to `/details/tv/${id}` (change from `/series/${id}`)

### 8. `src/components/MovieRow.tsx` — Support anime mediaType

- Pass `mediaType` through to `MovieCard` — already does this, just needs "anime" added to type

### 9. `src/pages/Index.tsx` — Expanded homepage rows

Add AniList-powered rows and additional TMDB genre rows. New row order:
1. Trending Now (existing)
2. Popular Movies (existing)
3. Popular TV Shows (existing)
4. **Trending Anime** (AniList `getTrendingAnime()`)
5. **Popular Anime** (AniList `getPopularAnime()`)
6. Nollywood (TMDB discover: `with_origin_country=NG`, tv)
7. K-Drama (existing)
8. C-Drama (TMDB: `with_original_language=zh`, tv)
9. Thai Drama (TMDB: `with_original_language=th`, tv)
10. South African Drama (TMDB: `with_origin_country=ZA`, tv)
11. Must Watch Black Stories (TMDB keyword/curated genre combo)
12. Romance (TMDB genre 10749)
13. Thriller & Mystery (TMDB genres 53, 9648)
14. Comedy (existing)
15. Animation (existing, or TMDB genre 16 all languages)
16. Kids & Teens (TMDB genre 10751 family + 10762 kids)
17. Documentaries (TMDB genre 99)
18. Sci-Fi & Fantasy (existing + genre 14)
19. Upcoming (TMDB `/movie/upcoming`)
20. Top Rated (existing)
21. Hidden Gems (existing)

AniList anime rows use a new `AnimeRow` component or adapt `MovieRow` to accept `AnimeItem[]`.

### 10. `src/App.tsx` — Update routing

- Add route: `/details/:type/:id` → `DetailsPage`
- Keep old routes (`/movie/:id`, `/series/:id`) as redirects to `/details/movie/${id}` and `/details/tv/${id}` for backward compatibility
- Keep `/player/:type/:id` (already correct)

### 11. `src/components/BottomNav.tsx` — Hide on details pages

- Add `/details/` to the hide list

### 12. `src/lib/tmdb.ts` — Add new discover functions

- `getByOriginCountry(country, mediaType, page)` for Nollywood, South African
- `getUpcoming(page)` for upcoming movies
- Add new CATEGORY_MAP entries for the new homepage rows
- Add genre IDs: romance (10749), thriller (53), fantasy (14), documentary (99), family (10751)

---

## Key Technical Details

- **ID isolation**: Anime IDs are AniList IDs. They are NEVER passed to TMDB functions. TMDB IDs are NEVER passed to AniList functions. The `type` param in routes enforces this separation.
- **Sub/Dub toggle**: Only renders when `type === "anime"`. Uses a Switch component (shadcn). Default: "sub". Changing it updates the Cinetaro URL's last segment and reloads the player.
- **Auto-fallback (movie/tv only)**: 7s timeout on Channel 1 → switch to Channel 2 → 7s timeout → switch to Channel 3. Anime has NO fallback.
- **AnimeItem → MovieCard bridge**: Create a lightweight adapter function `animeToCard(anime: AnimeItem): TMDBMovie` that maps AniList fields to the TMDBMovie shape so existing MovieCard/MovieRow can render anime cards without modification to their core logic.

## Summary

| File | Action |
|------|--------|
| `src/lib/anilist.ts` | **Create** — AniList API client |
| `src/pages/DetailsPage.tsx` | **Create** — Unified details page for movie/tv/anime |
| `src/components/AnimeEpisodeList.tsx` | **Create** — Episode list for anime |
| `src/lib/player.ts` | Modify — Add anime URL, Channel 3, `disabledForAnime` |
| `src/pages/PlayerPage.tsx` | Modify — Anime support, sub/dub toggle, 3-channel fallback |
| `src/pages/SearchPage.tsx` | Modify — Dual-source search, filters, deduplication |
| `src/components/MovieCard.tsx` | Modify — Anime routing, new URL scheme |
| `src/pages/Index.tsx` | Modify — Add 15+ new homepage rows |
| `src/lib/tmdb.ts` | Modify — New discover functions, genre IDs, categories |
| `src/App.tsx` | Modify — Add `/details/:type/:id` route |
| `src/components/BottomNav.tsx` | Modify — Hide on `/details/` |
| `src/lib/library.ts` | Modify — Support `mediaType: "anime"` |

