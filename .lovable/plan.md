

# Full System Fix, Optimization & Production-Ready Plan

## Summary
Fix Continue Watching (anime support, deduplication, completion tracking), Watchlist (filter bugs, toggle behavior), Homepage (reorder rows, add strict TMDB filtering, deduplication), MovieCard (type labels), and player channel labels. No Simkl integration (no API key available) — TMDB remains discovery source with stricter filtering.

## Architecture

```text
Data Flow:
  TMDB → discovery + metadata (movie/tv)
  AniList → anime discovery + metadata
  TasteDive → recommendations enrichment only

Content filter pipeline:
  TMDB fetch → filterQuality() → deduplicate() → render
```

---

## Files to Modify

### 1. `src/lib/tmdb.ts` — Strict TMDB filtering + new fetch functions

**Add global quality filter function:**
```ts
function filterQuality(items: TMDBMovie[]): TMDBMovie[] {
  return items.filter(i => i.poster_path && (i.vote_count ?? 0) >= 50);
}
```

**Update existing fetch functions** to add strict params:

- `getTrendingMovies()` — new function using `discover/movie` with `vote_count.gte=300`, `vote_average.gte=6`, `primary_release_date.gte=2018-01-01`
- `getTrendingSeries()` — new function using `discover/tv` with `vote_count.gte=200`, `vote_average.gte=6`, `first_air_date.gte=2018-01-01`
- `getAnimation()` — strict: `with_genres=16`, `vote_count.gte=200`, `vote_average.gte=6`, `primary_release_date.gte=2015-01-01`
- `getKidsTeens()` — `with_genres=10762`, `certification_country=US`, `certification.lte=PG-13`, `vote_count.gte=50`
- `getKoreanDrama()` — add `vote_count.gte=100`
- `getJapaneseShows()` — `with_original_language=ja`, `without_genres=16`, `vote_count.gte=100`
- `getBlackStories()` — `with_keywords=urban`, `vote_count.gte=100` (fallback: drama genre with specific keywords)
- `getAction()` — `with_genres=28,12`, `vote_count.gte=300`
- `getRomanceDrama()` — `with_genres=10749,18`, `vote_count.gte=200`
- `getComedy()` — `with_genres=35`, `vote_count.gte=200`
- `getHorror()` — `with_genres=27`, `vote_count.gte=200`, `vote_average.gte=5.5`

All functions apply `filterQuality()` before returning. Update `CATEGORY_MAP` accordingly.

### 2. `src/lib/library.ts` — Fix Continue Watching + Watchlist

**Continue Watching fixes:**
- `updateProgress`: match by `id + mediaType` (not just `id`) to avoid cross-type collisions
- Add `markCompleted(id, mediaType)` function that sets `progress: 100` and a `completed` flag
- `continueWatching` getter: filter out items where `progress >= 100`
- `removeFromWatchlist`: match by `id + mediaType`
- `isInWatchlist`: match by `id + mediaType` (add `mediaType` param)

**Watchlist fixes:**
- `addToWatchlist` dedup check: match by `id + mediaType`
- Add `toggleWatchlist(movie, mediaType)` — adds if not present, removes if present
- Fix filter: anime filter uses `mediaType === "anime"` (not genre_ids check)

### 3. `src/components/ContinueWatchingRow.tsx` — Support anime

- Add anime link: `item.mediaType === "anime"` → `/player/anime/${id}?season=1&episode=${ep}`
- Handle anime poster (full URL from `_isAnimeCard` marker, same as MovieCard)
- Show episode info for anime: `E${item.episode}`

### 4. `src/pages/Index.tsx` — Reorder rows + deduplication

**New row order** (per Section 4):
1. Trending Now (all/day)
2. ~~Picked For You~~ (skip — no user profile system; would be empty)
3. Continue Watching
4. Trending Movies (strict filtered)
5. Trending Series (strict filtered)
6. Trending Anime
7. Popular Anime
8. Animation (strict)
9. Kids & Teens
10. Global Hits (popular all)
11. Korean Drama
12. Japanese Shows (non-anime)
13. Black Stories
14. Action & Adventure
15. Romance & Drama
16. Comedy & Feel-Good
17. Horror

**Deduplication:** After Trending Now loads, collect IDs into a Set. Pass to Trending Movies/Series rows and filter those results to exclude already-shown IDs. Implement via a simple `excludeIds` param or post-fetch filter.

Remove old rows: Nollywood, C-Drama, Thai Drama, South African Drama, Upcoming, Top Rated, Hidden Gems, Documentaries, Sci-Fi & Fantasy (replaced by the new consolidated rows).

### 5. `src/components/MovieCard.tsx` — Add type label

Show a small type badge on each card:
- `MOVIE`, `TV`, `ANIME` label in top-right corner
- Small semi-transparent pill overlay

### 6. `src/pages/LibraryPage.tsx` — Fix watchlist filter

- Change anime filter from `m.genre_ids?.includes(16) && m.original_language === "ja"` to `m.mediaType === "anime"`
- Pass correct `mediaType` to MovieCard (currently casts to `"movie" | "tv"`, missing `"anime"`)
- Implement toggle button behavior: use `toggleWatchlist` from library

### 7. `src/pages/DetailsPage.tsx` — Watchlist toggle behavior + recs limit 20

- Watchlist button: use `toggleWatchlist` — first click adds ("Added"), second click removes ("Add to Library")
- Show text labels on button instead of just icons
- Increase TasteDive recommendation limit from 12 to 20
- Add failsafe: if TasteDive returns empty, fall back to TMDB `getSimilar()` for movie/tv or AniList recs for anime

### 8. `src/pages/PlayerPage.tsx` — Anime progress saving + channel labels

- Save anime progress to Continue Watching (currently only saves movie/tv)
- Channel labels: anime channels display as "Channel 1" and "Channel 2" (not "Megaplay" / "Cinetaro")
- Change `ANIME_CHANNELS[0].name` to "Channel 1" and `ANIME_CHANNELS[1].name` to "Channel 2"

### 9. `src/lib/player.ts` — Update anime channel names

- `ANIME_CHANNELS[0].name = "Channel 1"`
- `ANIME_CHANNELS[1].name = "Channel 2"`

### 10. `src/lib/tastedive.ts` — Increase limit to 20

- Change `limit=12` to `limit=20` in URL
- Change result caps from 12 to 20

---

## Key Bug Fixes

| Bug | File | Fix |
|-----|------|-----|
| Anime missing from Continue Watching | PlayerPage, ContinueWatchingRow | Save anime progress; handle anime links |
| Watchlist anime filter broken | LibraryPage | Use `mediaType === "anime"` not genre check |
| Watchlist button not toggling | DetailsPage, library.ts | Add `toggleWatchlist`, show text state |
| No type label on cards | MovieCard | Add type badge overlay |
| No quality filtering on TMDB | tmdb.ts | Add `vote_count.gte`, `vote_average.gte` params |
| Duplicate content across rows | Index.tsx | ID-based dedup between Trending Now and Movies/Series |
| Channel labels wrong for anime | player.ts | Change names to "Channel 1"/"Channel 2" |

## Files Summary

| File | Action |
|------|--------|
| `src/lib/tmdb.ts` | Add strict filter functions, quality filter, new categories |
| `src/lib/library.ts` | Fix dedup by id+type, add toggleWatchlist, markCompleted, filter completed |
| `src/lib/player.ts` | Rename anime channel names |
| `src/lib/tastedive.ts` | Increase limit to 20 |
| `src/components/ContinueWatchingRow.tsx` | Support anime type |
| `src/components/MovieCard.tsx` | Add type label badge |
| `src/pages/Index.tsx` | Reorder rows, new fetch calls, dedup |
| `src/pages/DetailsPage.tsx` | Watchlist toggle, recs failsafe, limit 20 |
| `src/pages/PlayerPage.tsx` | Save anime progress |
| `src/pages/LibraryPage.tsx` | Fix anime filter, toggle button |

