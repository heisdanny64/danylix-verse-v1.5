

# D.Verse Anime Integration + VidSrc Fix Plan

## Overview
Three major workstreams: fix VidSrc Channel 1 URLs, integrate Jikan API for anime data, and wire anime streaming through VidLink using MAL IDs.

---

## 1. Fix VidSrc Channel 1 (`src/lib/player.ts`)

Current domain `vidsrc-embed.ru` returns "media unavailable". Switch to:
- Movie: `https://vidsrc.xyz/embed/movie/{tmdbId}`
- TV: `https://vidsrc.xyz/embed/tv/{tmdbId}/{season}/{episode}`

Update sandbox to `allow-scripts allow-same-origin allow-forms allow-presentation` and add `allow="fullscreen"`.

## 2. New Jikan API Module (`src/lib/jikan.ts`)

Create a new module for all anime data fetching. No API key needed.

```text
Interfaces:
  JikanAnime { mal_id, title, images, synopsis, episodes, genres, score, status, ... }

Functions:
  jikanFetch<T>(path) — base fetcher with rate-limit handling (3req/s)
  getTopAnime(page) — /top/anime
  getCurrentSeasonAnime(page) — /seasons/now
  getUpcomingAnime(page) — /seasons/upcoming
  searchAnime(query) — /anime?q={query}
  getAnimeRecommendations(malId) — /anime/{mal_id}/recommendations
  getAnimeById(malId) — /anime/{mal_id}/full

Adapter:
  jikanToTMDBMovie(anime: JikanAnime): TMDBMovie
    Maps Jikan data into TMDBMovie shape so existing MovieCard/MovieRow work unchanged.
    Sets media_type to "anime", stores mal_id in the id field, 
    uses images.jpg.large_image_url for poster_path (full URL stored directly).
```

Key design decision: Anime items will use `media_type: "anime"` to distinguish them from regular TV. The `id` field will hold the `mal_id`.

## 3. Update TMDBMovie + Poster Handling (`src/lib/tmdb.ts`)

- Add `mal_id?: number` to `TMDBMovie` interface
- Update `posterUrl()` to handle full URLs (Jikan images are absolute URLs, not TMDB paths): if path starts with `http`, return it directly

## 4. Update Player Channel System (`src/lib/player.ts`)

Extend `Channel.getUrl` signature to accept an optional `contentType` parameter to distinguish anime:

```ts
getUrl: (type: "movie" | "tv" | "anime", id: number, season?: number, episode?: number, subDub?: "sub" | "dub") => string
```

- **Channel 1 (VidSrc)**: Fix URLs as above. Only handles movie/tv (returns empty for anime).
- **Channel 2 (VidLink)**: Add anime URL pattern: `https://vidlink.pro/anime/{mal_id}/{episode}/{subOrDub}`
- For anime, Channel 1 is disabled (VidSrc doesn't support MAL IDs), so the player auto-selects Channel 2.

## 5. Update Player Page (`src/pages/PlayerPage.tsx`)

- Add new route support: `/player/anime/:id` with query params `?episode=X&subDub=sub`
- Detect content type from route param `type` — now supports `"movie" | "tv" | "anime"`
- For anime type:
  - Fetch details from `getAnimeById(malId)` instead of TMDB
  - Pass `mal_id` to channel URL builder
  - Show Sub/Dub toggle (already conditional, just needs `type === "anime"` check)
  - Auto-select Channel 2 (only channel supporting anime)
  - Episode navigation uses Jikan episode count
- For movie/tv: behavior unchanged

## 6. Update MovieCard Links (`src/components/MovieCard.tsx`)

Add anime routing:
```ts
const link = type === "anime" 
  ? `/player/anime/${movie.id}?episode=1&subDub=sub`
  : type === "tv" ? `/series/${movie.id}` 
  : `/movie/movie-${movie.id}`;
```

Anime cards link directly to the player (no separate details page needed for MVP).

## 7. Populate Anime Rows on Home Page (`src/pages/Index.tsx`)

Replace the two TMDB-based anime rows with Jikan data:
- "Popular Anime" → `getTopAnime()` mapped through `jikanToTMDBMovie`
- "Current Season" → `getCurrentSeasonAnime()` (new row, replaces "Trending Anime")
- "Upcoming Anime" → `getUpcomingAnime()` (new row)

## 8. Update Category Map + Category Page (`src/lib/tmdb.ts`, `src/pages/CategoryPage.tsx`)

Update `CATEGORY_MAP` entries for anime slugs to use Jikan fetch functions:
- `"popular-anime"` → `getTopAnime(page)`
- `"current-season-anime"` → `getCurrentSeasonAnime(page)`
- `"upcoming-anime"` → `getUpcomingAnime(page)`

Add `mediaType: "anime"` to these configs so CategoryPage passes the right type to MovieCard.

Update `CategoryConfig.mediaType` to include `"anime"`.

## 9. Update Search (`src/pages/SearchPage.tsx`)

Add anime search results alongside TMDB results:
- Fetch from both `searchTMDB(query)` and `searchAnime(query)` in parallel
- Merge results, with anime items having `media_type: "anime"`
- Existing MovieCard handles rendering since we use the adapter

## 10. Add Route (`src/App.tsx`)

Add: `<Route path="/player/anime/:id" element={<PlayerPage />} />`

---

## Files Summary

| File | Action |
|------|--------|
| `src/lib/jikan.ts` | **Create** — Jikan API module with all endpoints + TMDBMovie adapter |
| `src/lib/player.ts` | Fix VidSrc URLs, add anime URL support to VidLink, extend getUrl signature |
| `src/lib/tmdb.ts` | Add `mal_id` to interface, fix `posterUrl` for absolute URLs, update CategoryConfig |
| `src/pages/PlayerPage.tsx` | Support anime content type, auto-select Ch2 for anime, fetch from Jikan |
| `src/pages/Index.tsx` | Replace TMDB anime rows with Jikan-powered rows |
| `src/pages/SearchPage.tsx` | Add parallel anime search |
| `src/pages/CategoryPage.tsx` | Support `mediaType: "anime"` |
| `src/components/MovieCard.tsx` | Add anime link routing |
| `src/App.tsx` | Add `/player/anime/:id` route |

No changes to: BottomNav, MovieDetails, SeriesDetails, LibraryPage, HeroBanner, styling system.

