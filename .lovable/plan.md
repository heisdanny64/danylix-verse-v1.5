

# D.Verse Unified Details + Content Fixes Plan

## Overview

Create a single unified details page for all content types (movie/tv/anime), fix routing, reorder homepage, fix search deduplication, and update library to support anime properly.

---

## 1. Create Unified Details Page (`src/pages/DetailsPage.tsx`)

**New file** replaces both `MovieDetails.tsx` and `SeriesDetails.tsx`.

Route: `/details/:type/:id` where type is `movie`, `tv`, or `anime`.

**Logic:**
- `movie` → fetch `getMovieDetails(id, "movie")` from TMDB
- `tv` → fetch `getMovieDetails(id, "tv")` from TMDB, also fetch seasons
- `anime` → fetch `getAnimeById(id)` from Jikan, adapt to same display shape

**Layout** (identical for all types):
- Backdrop image (Jikan large_image_url for anime, TMDB backdrop for movie/tv)
- Back button overlay
- Title, year, rating, runtime/episodes, status
- Genre tags
- Overview text
- Action buttons:
  - **Upcoming anime** (status === "Not yet aired") → "Add to Wishlist" button instead of "Watch Now"
  - **All other content** → "Watch Now" navigates to `/player/:type/:id`
  - Watchlist toggle button
- For **TV**: Season accordions with episode lists (reuse existing `EpisodeList` component)
- For **anime**: Episode count display, "Watch Now" goes to `/player/anime/:id?episode=1&subDub=sub`
- "More Like This" row: `getSimilar` for movie/tv, `getAnimeRecommendations` for anime

## 2. Update Routing (`src/App.tsx`)

```
Remove: /movie/:id, /series/:id
Add:    /details/:type/:id
Keep:   /player/:type/:id, /player/anime/:id
```

## 3. Update MovieCard Links (`src/components/MovieCard.tsx`)

All cards now link to the unified details page:
```ts
const link = `/details/${type}/${movie.id}`;
```
No more `/movie/movie-123` format. No more direct-to-player for anime.

## 4. Update HeroBanner (`src/components/HeroBanner.tsx`)

Change `handleWatch` to navigate to `/details/${type}/${movie.id}` instead of directly to player/series.

## 5. Reorder Homepage Rows (`src/pages/Index.tsx`)

New order:
1. Hero Banner
2. Continue Watching
3. Trending Today
4. **Trending Anime** (Popular Anime from Jikan)
5. Popular Movies (Picked For You)
6. **Popular Anime** (Current Season from Jikan)
7. Top Rated TV (Popular Series)
8. **Seasonal Anime** (Upcoming Anime from Jikan)
9. Then remaining: Action, Comedy, Sci-Fi, Horror, Crime, Mystery, Korean, Japanese, Hidden Gems

## 6. Fix Search Deduplication (`src/pages/SearchPage.tsx`)

Current search runs both TMDB and Jikan in parallel. Change to:
- Run both searches in parallel
- Deduplicate: if a title appears in both Jikan and TMDB results, keep only the Jikan (anime) version
- Dedup by normalized title comparison (lowercase, trim)
- Also keep existing id+media_type dedup

## 7. Fix VidLink Anime URL (`src/lib/player.ts`)

Add `?fallback=true` to VidLink anime URLs:
```
https://vidlink.pro/anime/{mal_id}/{episode}/{subOrDub}?fallback=true
```

VidSrc stays at `vidsrc.xyz` with correct sandbox.

## 8. Update Library System (`src/lib/library.ts`)

- Extend `ContinueWatchingItem.mediaType` to include `"anime"`
- Extend `addToWatchlist` mediaType param to include `"anime"`
- Library filter for anime: check `mediaType === "anime"` instead of genre+language heuristic

## 9. Update LibraryPage (`src/pages/LibraryPage.tsx`)

Fix anime filter to use `m.mediaType === "anime"` instead of the current genre_ids heuristic.

## 10. Update ContinueWatchingRow

Check if it handles anime mediaType for routing — ensure it links to `/details/anime/:id`.

---

## Files Summary

| File | Action |
|------|--------|
| `src/pages/DetailsPage.tsx` | **Create** — unified details for movie/tv/anime |
| `src/pages/MovieDetails.tsx` | **Delete** (replaced by DetailsPage) |
| `src/pages/SeriesDetails.tsx` | Keep file but remove route (or delete) |
| `src/App.tsx` | Update routes |
| `src/components/MovieCard.tsx` | All links → `/details/:type/:id` |
| `src/components/HeroBanner.tsx` | Navigate to details page |
| `src/pages/Index.tsx` | Reorder rows per spec |
| `src/pages/SearchPage.tsx` | Anime-first dedup |
| `src/lib/player.ts` | Add `?fallback=true` to VidLink anime URL |
| `src/lib/library.ts` | Support `"anime"` mediaType |
| `src/pages/LibraryPage.tsx` | Fix anime filter |
| `src/components/ContinueWatchingRow.tsx` | Fix anime links |

No changes to: PlayerPage, BottomNav, CategoryPage, MovieRow, styling.

