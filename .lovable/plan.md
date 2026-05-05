## Scope

Targeted fixes only — no rewrites of Player UI, streaming logic, downloads, or TMDB/Supabase layers.

---

## 1. Search Page

### Bug found (TMDB posters disappear)
`mediaToTmdbCard` in `src/lib/media.ts` sets `poster_path: null` for TMDB items (only kept for `source === "gifted"`). `MovieCard` then renders the placeholder. Fix: always pass through a usable poster.

### Fixes (`src/lib/media.ts`, `src/pages/SearchPage.tsx`)

- `mediaToTmdbCard`: set `poster_path` to the original TMDB path (or pre-built URL for gifted) and let MovieCard render correctly. Also pass `backdrop_path` consistently.
- `MovieCard`: detect already-absolute URLs (starts with `http`) and use as-is; otherwise feed through `posterUrl`. Removes reliance on `_giftedId` for image source.
- SearchPage:
  - Remove the `"gifted"` filter chip. Final filters: **All / Movies / TV**.
  - Keep parallel `useQuery` calls (already parallel via React Query) but track `tmdbResults` and `giftedResults` independently and only compute `merged` when both queries are settled (use `isSuccess` not just `isLoading`) so partial TMDB results don't get clobbered by a later Gifted resolve.
  - Add Gifted noise filter before merging:
    ```ts
    const SEASON_NOISE = /\b(s\d+(\s*-\s*s?\d+)?|season\s?\d+)\b/i;
    gifted = gifted.filter(g => !SEASON_NOISE.test(g.title));
    ```
  - Keep variant tokens (`[English]`, `[Dub]`, `[Sub]`, `[Subbed]`, `[Dubbed]`, `[Raw]`) — these stay via existing `variantKey`.
  - Dedup rule: if a Gifted item's normalized title equals a TMDB item AND has no variant token → drop. If it has a variant token → keep. If no TMDB match → keep (Nollywood etc.).
  - Interleave (don't concatenate): merge by alternating from TMDB and filtered-Gifted arrays so results read mixed (e.g. `Naruto`, `Naruto [English]`, `Naruto Shippuden`, …).

---

## 2. Details Page Unification

### Delete
- `src/pages/GiftedDetailsPage.tsx`
- Route `/details/gifted/:id` in `src/App.tsx`
- Import in `App.tsx`

### Update `src/components/MovieCard.tsx`
Route Gifted items to the unified page using a `gifted` source param:
`/details/movie/:id?source=gifted` (or `tv`). Drop the `/details/gifted/...` branch.

### Update `src/pages/DetailsPage.tsx`
- Read `source` from `useSearchParams`. Default `"tmdb"`.
- If `source === "gifted"`: fetch via Gifted `/info/{id}` (new helper `getGiftedInfo` in `giftedApi.ts` calling `info/{id}`) and **normalize** to the existing `TMDBMovieDetail` shape:
  - `title`, `overview`, `vote_average` (from rating), `genres` (map array of strings → `[{id, name}]`), `backdrop_path` = cover/image URL (already absolute — DetailsPage's `<img>` will use as-is; add an absolute-URL passthrough in `backdropUrl` or render conditionally), `poster_path` likewise, `seasons` if present (Gifted info exposes seasons/episodes for series; build season list and feed `EpisodeList` with a Gifted-specific renderer OR a thin season list rendered inline).
  - Cast: map Gifted `stars` → existing `CastRow` shape. Section heading stays **"Cast & Characters"**.
- Watch button stays the same (`/player/movie/:id` or `/player/tv/:id`); pass `?source=gifted` so Player skips TMDB matching and uses the id directly.

### `src/components/CastRow.tsx`
Accept either TMDB cast (current path) or pre-shaped cast from a `cast` prop. When `cast` prop is supplied, skip the TMDB query.

### `src/components/EpisodeList.tsx`
Add a `source` prop. When `source === "gifted"`, render episodes from a passed array instead of TMDB season fetch.

---

## 3. Matching Accuracy (Naruto → Naruto, not Naruto [English])

In `src/services/giftedApi.ts > findBestMatch`:

- After scoring, **prefer exact normalized-title matches**: if any candidate's `normalizeTitle(r.title) === normalizeTitle(opts.title)`, lock the highest scoring exact match before falling back to fuzzy.
- Penalize titles containing variant tokens (`english|dub|dubbed|sub|subbed|raw`) **unless** the search query itself contains that token: `score -= 0.25`.
- Penalize season-noise titles (`S1`, `Season 2`): `score -= 0.4`.
- Keep year ±2, type match, threshold 0.7.

---

## 4. Player Streaming Stuck on Loading

Likely causes (no UI changes):

- `findBestMatch` cache may have persisted `null` for a working title in `sessionStorage` → query returns `null` and `getGiftedSources` is disabled → indefinite spinner. Fix:
  - Bump cache key version (`dverse_gifted_subject_cache_v3`).
  - Don't cache `null` results — only cache positive matches so failed lookups retry.
- Honor `?source=gifted` in `Player.tsx`: if present, skip `findBestMatch` and use `id` directly as `subjectId`. This removes a failure path entirely for Gifted-origin content.
- Add visible diagnostics (console only — no UI change): log `subjectId`, `sourcesData?.results.length`, and surface a "no sources" overlay when `sourcesData` resolves but `results` is empty (the existing `streamError` overlay).
- In the source-loading effect, if `sources.length === 0` after `loadingSources` becomes false, set `streamError` so the spinner stops.

---

## 5. App Sweep & Desktop Top Nav

### `src/components/BottomNav.tsx`
- Hide on viewports ≥ `md` (Tailwind `md:hidden` on the `<nav>`).
- Keep mobile/tablet behavior identical.

### New `src/components/TopNav.tsx` (desktop ≥ md)
Sticky top bar (no hide-on-scroll), structure left → right:
- Logo + wordmark (link to `/`)
- Nav links close to logo: **Home / Discover / Library** (icon + label)
- Search input (navigates to `/search?q=...` on submit)
- Profile avatar (links to `/profile` or `/auth`)

Hidden on `/player/*` and `/auth`. Mounted in `App.tsx` alongside `BottomNav` with `hidden md:flex`.

### Other sweep items
- Remove unused `GiftedDetailsPage` import, dead anime route handlers.
- Verify `MovieRow` uses fluid widths on desktop (already does via `clamp`).
- Ensure DetailsPage hero scales on wide screens (cap content width at `max-w-5xl mx-auto` for prose + actions; backdrop stays full-width).
- Search grid already responsive (`grid-cols-2 sm:3 md:4`) — bump to `lg:grid-cols-5 xl:grid-cols-6`.
- Library + Discover pages: add top padding on desktop to clear the sticky top nav.

---

## Files Changed

```text
src/App.tsx                          - remove gifted route + import, mount TopNav
src/components/BottomNav.tsx         - md:hidden
src/components/TopNav.tsx            - NEW
src/components/MovieCard.tsx         - poster passthrough, drop gifted route
src/components/CastRow.tsx           - accept pre-shaped cast prop
src/components/EpisodeList.tsx       - optional source=gifted mode
src/lib/media.ts                     - fix mediaToTmdbCard poster_path
src/pages/SearchPage.tsx             - remove Gifted filter, noise filter, interleave merge, settled-merge
src/pages/DetailsPage.tsx            - source-aware fetch + normalization
src/pages/Player.tsx                 - source=gifted bypass, no-sources error, no-null cache
src/services/giftedApi.ts            - getGiftedInfo helper, exact-match preference, variant/season penalties, cache v3 (no null)
src/pages/GiftedDetailsPage.tsx      - DELETE
```

No changes to streaming URL handling, Player UI/controls, downloads, Supabase schema, or TMDB metadata flow.
