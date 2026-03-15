

# D.Verse Patch Plan — Player, Streaming, Responsiveness, Content Fixes

## Files to Modify
- `src/lib/player.ts` — Fix channel URLs, add Channel 3 as disabled placeholder
- `src/lib/tmdb.ts` — Add `origin_country` to TMDBMovie, add `isAnime()` helper, add paginated fetch support, add freshness sorting
- `src/pages/PlayerPage.tsx` — Full rebuild: centered 16:9 player, gesture overlay, fullscreen button, anime-only sub/dub, error state
- `src/pages/CategoryPage.tsx` — Pagination/infinite scroll, responsive grid
- `src/components/MovieCard.tsx` — Responsive card sizing with clamp
- `src/components/MovieRow.tsx` — Responsive skeleton/card widths

---

## 1. Fix Channel URLs (`src/lib/player.ts`)

**Channel 1 (VidSrc)** — fix URL format:
- Movie: `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`
- TV: `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${e}`

**Channel 2 (VidLink)** — replace vidsrc.to with vidlink.pro:
- Movie: `https://vidlink.pro/movie/${tmdbId}`
- TV: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`

**Channel 3** — mark as disabled placeholder, `getUrl` returns empty string. Add `disabled: boolean` and `label: string` fields to Channel interface.

## 2. Player Page Rebuild (`src/pages/PlayerPage.tsx`)

Replace current full-height stretchy layout with a centered, content-aware player page:

**Layout:**
- Outer container: centered, `max-w-[1100px]`, padded
- Video wrapper: `aspect-video` (16:9), `rounded-2xl`, `overflow-hidden`, black bg
- iframe fills wrapper, no min-height hacks

**Controls above/below player (not overlay on iframe):**
- Top bar: back button, title, year/rating, S/E info for TV
- Channel switcher row: Ch1, Ch2 active; Ch3 disabled with "Coming Soon" label; clicking Ch3 shows toast
- Sub/Dub toggle: **only visible when `isAnime(details)` is true**
- Episode nav (TV only): Previous/Next buttons below player

**Fullscreen:**
- Add Maximize icon button in controls
- On click: `videoWrapperRef.requestFullscreen()`
- Works naturally on mobile for landscape

**Error state:**
- If `tmdbId` is falsy or `playerUrl` is empty, render a clean error card: "Playback unavailable. Try another channel."
- Don't render iframe until details have loaded (guard with `if (!details) return loading state`)

**Gesture layer:**
- Transparent div over iframe, single tap toggles control visibility
- Controls auto-hide after 4 seconds
- `pointer-events: none` when hidden, `auto` when visible

## 3. Anime Detection (`src/lib/tmdb.ts`)

Add `origin_country?: string[]` to `TMDBMovie` and `TMDBMovieDetail` interfaces.

Add helper:
```ts
export function isAnime(item: TMDBMovie | TMDBMovieDetail): boolean {
  const isJapanese = item.original_language === "ja";
  const isAnimation = ('genre_ids' in item ? item.genre_ids : item.genres?.map(g => g.id) || []).includes(16);
  const fromJapan = ('origin_country' in item) && (item.origin_country || []).includes("JP");
  return isJapanese && isAnimation;
}
```

Use in PlayerPage to conditionally render Sub/Dub toggle.

## 4. Content Freshness (`src/lib/tmdb.ts`)

Add freshness sort utility:
```ts
export function sortByFreshness(items: TMDBMovie[]): TMDBMovie[] {
  return [...items].sort((a, b) => getFreshnessScore(b) - getFreshnessScore(a));
}
```

Apply to trending/popular rows in `Index.tsx` — wrap results with `sortByFreshness()`.

Add date range params to discover calls for trending-type rows: `primary_release_date.gte` set to ~1 year ago to prioritize recent content.

## 5. Category Page Pagination (`src/pages/CategoryPage.tsx`)

**Changes:**
- Update `CategoryConfig.fetchFn` signature to accept optional `page` parameter
- Update all CATEGORY_MAP entries to pass page through to tmdbFetch
- Add `page` state, "Load More" button at bottom
- Accumulate results across pages
- Initial load: page 1 (20 items); each "Load More" fetches next page and appends
- Show loading skeleton at bottom while fetching

**Responsive grid:**
- Replace `grid-cols-3` with `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`
- Gap scales: `gap-3 md:gap-4`

## 6. Responsive Card Sizing (`src/components/MovieCard.tsx`, `src/components/MovieRow.tsx`)

**MovieCard:** Change non-compact width from fixed `w-[140px] md:w-[180px]` to responsive `w-[clamp(130px,22vw,220px)]` using inline style or Tailwind arbitrary value.

**MovieRow:** Match skeleton widths to new card sizing.

**CategoryPage grid cards:** Already `w-full` in compact mode — just needs the grid column fix above.

## 7. TMDB Fetch with Pagination (`src/lib/tmdb.ts`)

Update fetch functions to accept optional `page` param:
```ts
export async function getByGenre(genreId, mediaType, page = 1) {
  // add page param to tmdbFetch call
}
```

Update `CategoryConfig` interface: `fetchFn: (page?: number) => Promise<TMDBMovie[]>`

Update all CATEGORY_MAP entries accordingly.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/lib/player.ts` | Fix Ch1 URLs, replace Ch2 with vidlink.pro, disable Ch3 |
| `src/lib/tmdb.ts` | Add `isAnime()`, `sortByFreshness()`, pagination support, `origin_country` field |
| `src/pages/PlayerPage.tsx` | Centered 16:9 layout, fullscreen button, gesture layer, anime-only sub/dub, error state, no iframe until data loads |
| `src/pages/CategoryPage.tsx` | Paginated loading, responsive grid columns |
| `src/components/MovieCard.tsx` | Responsive card width with clamp |
| `src/components/MovieRow.tsx` | Match responsive card/skeleton widths |

No changes to: App.tsx routing, BottomNav, navigation logic, branding, Index.tsx structure, MovieDetails, SeriesDetails, LibraryPage, SearchPage.

