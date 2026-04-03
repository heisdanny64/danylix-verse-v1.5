

# Anime Player + TasteDive Recommendations + View All Infinite Scroll Plan

## Summary
1. Update anime channels: Megaplay (primary) + Cinetaro (fallback), both iframe
2. Add TasteDive recommendation system for movie/tv/anime details pages
3. Add "More Like This" to anime details using AniList recs + TasteDive
4. Add View All pages for anime rows with infinite scroll
5. Cinetaro stays iframe (already set)

## Changes

### 1. `src/lib/player.ts` — Update anime channels

Replace current channel system for anime:

- **Channel 1** becomes **Megaplay** (primary for anime):
  - URL: `https://megaplay.buzz/stream/ani/${anilistId}/${episode}/${subOrDub}`
  - Season is always 1 (baked in, not passed)
  - type: `iframe`
- **Channel 2** becomes **Cinetaro** (fallback for anime):
  - URL: `https://apicinetaro.falex43350.workers.dev/anime/${id}/1/${episode}/${subOrDub}`
  - Season hardcoded to 1
  - type: `iframe`

For movie/tv, channels stay as-is (Cinetaro, VidLink, SuperEmbed).

Implementation: restructure `CHANNELS` so anime has its own channel list, or add a `getAnimeUrl` method. Simplest approach: add a separate `ANIME_CHANNELS` array exported alongside `CHANNELS`.

### 2. `src/lib/tastedive.ts` — New file: TasteDive API client

- API key: `1070975-DVerseMo-572562DC` (public, stored in code)
- `getTasteDiveSuggestions(title: string, type: "movies" | "shows"): Promise<string[]>`
  - Fetch `https://tastedive.com/api/similar?q=${title}&type=${type}&limit=12&k=...`
  - Return `data.Similar.Results.map(r => r.Name)`
- `getMovieTVRecommendations(title: string, type: "movies" | "shows"): Promise<TMDBMovie[]>`
  - Get TasteDive suggestions → for each, search TMDB → filter out missing posters → limit 12
- `getAnimeRecommendations(title: string, anilistId: number): Promise<AnimeCard[]>`
  - Step 1: Fetch AniList recommendations (from `getAnimeDetails` relations or a new query with `recommendations` field)
  - Step 2: Fetch TasteDive suggestions (type=shows)
  - Step 3: For each TasteDive result, search AniList; if found, include; if not, discard
  - Step 4: Merge AniList recs + validated TasteDive results, deduplicate by title, limit 12

### 3. `src/lib/anilist.ts` — Add recommendations query

Add a `getAnimeRecommendations(id: number)` function that queries AniList's `recommendations` field on `Media`:
```graphql
recommendations(perPage: 12) {
  nodes {
    mediaRecommendation { id title { romaji english } coverImage { large extraLarge } ... }
  }
}
```
Returns `AnimeItem[]`.

### 4. `src/pages/DetailsPage.tsx` — Add "More Like This" sections

**Movie/TV**: Replace current `getSimilar` with TasteDive pipeline:
- Query: `useQuery(["recommendations", title, contentType], () => getMovieTVRecommendations(title, type))`
- Render as `MovieRow` titled "More Like This"

**Anime**: Add "More Like This" section:
- Query: `useQuery(["anime-recommendations", anime.id, anime.title], () => getAnimeRecommendations(title, id))`
- Render as `MovieRow` with anime cards

**Anime episodes**: Remove seasons dropdown per spec — show flat episode list only.

### 5. `src/pages/PlayerPage.tsx` — Update for Megaplay + Cinetaro anime channels

- Import `ANIME_CHANNELS` from player.ts
- When `contentType === "anime"`: use `ANIME_CHANNELS` instead of `CHANNELS`
- Channel names display as "Megaplay" and "Cinetaro"
- Both are iframe type
- Season always = 1 for anime streaming URLs
- Sub/dub toggle remains, reloads player on change
- No auto-fallback for anime (user manually switches)

### 6. Anime View All — Infinite scroll pages

**`src/pages/Index.tsx`**: Add `slug` to anime rows:
- `slug="trending-anime"` for Trending Anime
- `slug="popular-anime"` for Popular Anime

**`src/pages/CategoryPage.tsx`**: Support anime categories:
- Extend `CategoryConfig` to support `mediaType: "anime"` and `fetchFn` returning anime cards
- Add to `CATEGORY_MAP` (or a new `ANIME_CATEGORY_MAP` in anilist.ts):
  - `"trending-anime"`: `{ title: "Trending Anime", mediaType: "anime", fetchFn: (page) => getTrendingAnime(page).then(map(animeToCard)) }`
  - `"popular-anime"`: same pattern with `getPopularAnime`
- Replace "Load More" button with **infinite scroll**: use `IntersectionObserver` on a sentinel div at the bottom to auto-load next page
- Cache previous pages (react-query already handles this with `keepPreviousData`)

### 7. `src/lib/tmdb.ts` — Update CategoryConfig type

Change `mediaType` in `CategoryConfig` from `"movie" | "tv"` to `"movie" | "tv" | "anime"` to support anime categories.

## Files Summary

| File | Action |
|------|--------|
| `src/lib/player.ts` | Add `ANIME_CHANNELS` array (Megaplay + Cinetaro for anime) |
| `src/lib/tastedive.ts` | **Create** — TasteDive API + enrichment pipelines |
| `src/lib/anilist.ts` | Add `getAnimeRecommendations()` with recommendations query |
| `src/pages/DetailsPage.tsx` | Replace "More Like This" with TasteDive pipeline; add anime recs; flatten anime episodes |
| `src/pages/PlayerPage.tsx` | Use `ANIME_CHANNELS` for anime; season=1 always |
| `src/pages/CategoryPage.tsx` | Replace Load More button with infinite scroll via IntersectionObserver |
| `src/lib/tmdb.ts` | Add anime entries to `CATEGORY_MAP`; widen `CategoryConfig.mediaType` |
| `src/pages/Index.tsx` | Add `slug` props to anime rows |

No changes to: App.tsx, BottomNav, MovieCard, MovieRow, SearchPage, library.ts, or HlsPlayer.

