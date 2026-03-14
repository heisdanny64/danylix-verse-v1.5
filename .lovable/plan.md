

# D.Verse Major Expansion Plan

## Summary
Transform the current 4-row home page into a full-featured movie/series streaming app with 12+ genre rows, a video player page, series season/episode support, library persistence via localStorage, and a hero banner.

---

## Architecture Overview

```text
Pages:
  /                  → Home (hero banner + 12+ rows)
  /search            → Search (existing)
  /movie/:id         → Movie Details (enhanced)
  /series/:id        → Series Details (new - seasons/episodes)
  /player/:type/:id  → Player Page (new - VidSrc embed)
  /category/:slug    → View All Page (new - full grid for a category)
  /recommendations   → Recommendations (existing)
  /library           → Library (enhanced - watchlist + continue watching)

New Modules:
  src/lib/tmdb.ts         → Add new fetch functions (by language, discover params)
  src/lib/library.ts      → localStorage watchlist + continue-watching state
  src/lib/player.ts       → Channel URLs (VidSrc + backups)
  src/components/HeroBanner.tsx
  src/components/EpisodeList.tsx
  src/pages/PlayerPage.tsx
  src/pages/SeriesDetails.tsx
  src/pages/CategoryPage.tsx
```

---

## Detailed Plan

### 1. TMDB API Layer Expansion (`src/lib/tmdb.ts`)

Add new fetch functions:
- `getTopRated(mediaType)` — top rated movies/series
- `getByGenreAndLanguage(genreId, lang, mediaType)` — for anime (genre 16 + `ja`), K-dramas (`ko`), Japanese series
- `getSeasonDetails(tvId, seasonNumber)` — fetch episodes per season
- `getTVDetails(id)` — extended TV detail including `seasons` array and `number_of_seasons`
- `getSimilar(id, mediaType)` — for "More Like This" section on details page
- Add genre IDs: comedy (35), crime (80), mystery (9648) to `GENRE_IDS`

### 2. Home Page Overhaul (`src/pages/Index.tsx`)

Replace current 4 rows with:
1. **Hero Banner** — featured trending item with backdrop, title, year, rating, "Watch Now" + "Add to Library" buttons
2. **Continue Watching** — from localStorage (hidden if empty)
3. **Trending Today** — `getTrending("all", "day")`
4. **Picked For You** — `getPopular("movie")`
5. **Popular This Week** — `getTrending("all", "week")`
6. **Top Rated Movies** — `getTopRated("movie")`
7. **Action Movies** — genre 28
8. **Comedy Movies** — genre 35
9. **Sci-Fi Movies** — genre 878
10. **Horror Movies** — genre 27
11. **Popular Series** — `getPopular("tv")`
12. **Crime Series** — genre 80, TV
13. **Mystery Series** — genre 9648, TV
14. **Popular Anime** — genre 16 + language `ja`
15. **Trending Anime** — trending + genre 16 filter
16. **Korean Dramas** — TV + language `ko`
17. **Japanese Series** — TV + language `ja`
18. **Hidden Gems** — discover with vote_count range (low popularity, high rating)

Each row gets a "View All →" link navigating to `/category/:slug`.

### 3. Hero Banner Component (`src/components/HeroBanner.tsx`)

- Full-width backdrop image from trending item
- Gradient overlay with title, year, rating
- Two buttons: "Watch Now" (navigates to player), "Add to Library"
- Auto-rotate through 5 trending items or static first item for MVP

### 4. Category/View All Page (`src/pages/CategoryPage.tsx`)

- Route: `/category/:slug`
- Slug maps to a TMDB fetch config (genre + mediaType + language)
- Paginated grid of posters with infinite scroll or "Load More"
- Back button header with category title

### 5. Movie Details Enhancement (`src/pages/MovieDetails.tsx`)

- Add three buttons: **Watch Now**, **Add to Library**, **Download** (shows toast "Coming Soon")
- Add "More Like This" section at bottom using `getSimilar(id, "movie")` — horizontal row
- Watch Now navigates to `/player/movie/${id}`

### 6. Series Details Page (`src/pages/SeriesDetails.tsx`)

- New page at route `/series/:id` (update MovieCard links: if TV → `/series/${id}`)
- Display backdrop, poster, title, year, rating, genres, description
- Buttons: Watch Now (S1E1), Add to Library, Download (placeholder)
- **Seasons**: collapsible accordion sections using existing Accordion component
- Each season fetched via `getSeasonDetails(id, seasonNum)` on expand
- Episode rows: episode number, title, thumbnail, runtime, play button
- Clicking episode → `/player/tv/${seriesId}?season=X&episode=Y`
- "More Like This" row at bottom

### 7. Player Page (`src/pages/PlayerPage.tsx`)

- Route: `/player/:type/:id` with query params `?season=X&episode=Y`
- Full-screen layout, no bottom nav
- **VidSrc embed**: `https://vidsrc.xyz/embed/{type}/{id}` (Channel 1)
- Channel 2 & 3: backup URLs (e.g., `vidsrc.to`, `2embed.cc`)
- Channel buttons above player, active one highlighted with primary color
- **Sub/Dub toggle** for anime content (appends subtitle params)
- **Episode navigation**: Previous/Next buttons for series, disabled at boundaries
- Back button returns to details page
- On play, save to continue-watching in localStorage

### 8. Library System (`src/lib/library.ts`)

- localStorage-based state management with React context or custom hooks
- **useLibrary hook** exposing:
  - `watchlist: TMDBMovie[]` — add/remove/check
  - `continueWatching: {movie: TMDBMovie, progress: number, season?: number, episode?: number}[]`
  - `addToWatchlist(movie)`, `removeFromWatchlist(id)`, `isInWatchlist(id)`
  - `updateProgress(movie, progress, season?, episode?)`
- Persisted to `localStorage` keys: `dverse_watchlist`, `dverse_continue_watching`

### 9. Library Page Enhancement (`src/pages/LibraryPage.tsx`)

- **Continue Watching** section: shows items with progress indicator
- **Watchlist** section: grid of saved posters
- Filter tabs: All / Movies / Series / Anime
- Tapping poster opens details page

### 10. Routing Updates (`src/App.tsx`)

Add routes:
- `/series/:id` → SeriesDetails
- `/player/:type/:id` → PlayerPage
- `/category/:slug` → CategoryPage

Update BottomNav to hide on player and series details pages.

### 11. MovieCard Link Update

- Detect mediaType: if `tv` → link to `/series/${id}`, if `movie` → link to `/movie/movie-${id}`
- This ensures series and movies are handled by their respective detail pages

---

## Files to Create
- `src/lib/library.ts` — localStorage watchlist/continue-watching hooks
- `src/lib/player.ts` — channel URL configs
- `src/components/HeroBanner.tsx`
- `src/components/EpisodeList.tsx`
- `src/pages/PlayerPage.tsx`
- `src/pages/SeriesDetails.tsx`
- `src/pages/CategoryPage.tsx`

## Files to Modify
- `src/lib/tmdb.ts` — new API functions
- `src/pages/Index.tsx` — hero + 12+ rows
- `src/pages/MovieDetails.tsx` — Watch Now, Download, More Like This
- `src/pages/LibraryPage.tsx` — functional watchlist + continue watching
- `src/components/MovieCard.tsx` — separate movie/series links
- `src/components/MovieRow.tsx` — add "View All →" link
- `src/components/BottomNav.tsx` — hide on new pages
- `src/App.tsx` — new routes

