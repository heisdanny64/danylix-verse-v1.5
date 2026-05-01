# Gifted API Migration Plan

## Goal
Replace all iframe/embed players with a single first-party HTML5 video player driven by the Gifted Movies API. Keep the existing `src/pages/Player.tsx` UI/styling, but rewire it to play real streams. Move the API key off the client by proxying every Gifted call through a Supabase Edge Function. Replace the Downloads page entry with a per-title Download Modal.

## What's broken today (important)
`src/pages/Player.tsx` in this repo is a stale mock that imports `@/lib/anilist/hooks` and `@/lib/store` — neither exists. It does not compile. The actually-working player is `src/pages/PlayerPage.tsx` + `src/components/HlsPlayer.tsx` (iframe channels + Cinetaro HLS). Per your instruction we will:
- Rewrite `Player.tsx` from scratch keeping its visual design (header, center play/pause, episode nav row, progress bar, settings panel with Quality / Subtitle / Audio / Speed, fullscreen rotate button) but back it with a real `<video>` + hls.js using Gifted sources.
- Delete `PlayerPage.tsx`, `HlsPlayer.tsx`, `src/lib/player.ts` (CHANNELS/ANIME_CHANNELS), and `Player.tsx`'s mock dependencies.
- Point the route `/player/:type/:id` at the new `Player.tsx`.

## 1. Edge Function: `gifted-proxy`
Create `supabase/functions/gifted-proxy/index.ts`. Public (no JWT). Takes a `path` query param and forwards to `https://movieapi.giftedtech.co.ke/api/v2/{path}` with the Bearer + `API_KEY` headers from secrets. Returns JSON or 502 on upstream failure. Standard CORS.

Secrets to add (via add_secret, not committed):
- `GIFTED_API_KEY` = `gifted_movieapi_x7xo5y3hx30riafeqdyhc27q716vld`
- `GIFTED_BEARER` (if the API requires a separate bearer; otherwise reuse `GIFTED_API_KEY`)

Endpoints proxied: `/search/{query}`, `/info/{id}`, `/sources/{id}` (with optional `season` + `episode`).

## 2. Client service: `src/services/giftedApi.ts`
Thin wrapper around `supabase.functions.invoke('gifted-proxy', { body: { path, query } })`. Functions:
- `searchGifted(title, page=1)` → results with `subjectId`
- `getGiftedSources(subjectId, season?, episode?)` → `{ results: Source[], subtitles: Subtitle[] }`
- `findBestMatch(title, year?, type)` — fuzzy match (normalize, strip "Season N", "II", "Part 2", punctuation), score by title similarity + year proximity, return top `subjectId` or `null`.

Types:
```ts
type Source = { quality: string; stream_url: string; download_url: string; size: number };
type Subtitle = { lan: string; lanName: string; url: string };
```

Cache `subjectId` per `(tmdbId|anilistId, type)` in-memory + sessionStorage. Never cache stream URLs.

## 3. Anime episode mapping
Anime sequels on AniList restart at episode 1, but Gifted often lists the franchise as one flat run. In `giftedApi.ts` add `resolveAnimeEpisode(anilistId, episode)`:
1. Walk AniList `relations` (PREQUEL edges) until no more prequels.
2. Sum `episodes` of all prequels in chronological order; offset = sum.
3. Return `episode + offset` for the Gifted query.
Cache the offset per AniList ID.

## 4. New `src/pages/Player.tsx`
Keep the existing visual structure from the current file (header bar with back/title/settings, center play/pause + ±10s, bottom episode-nav + progress, settings sheet with Quality/Subtitle/Audio/Speed sub-views, floating rotate-to-fullscreen button, auto-hide controls, double-tap-to-seek).

Replace the mock with:
- Real `<video ref>` rendering Gifted `stream_url` via `hls.js` (fallback to native on Safari).
- On mount: derive `(type, id, season?, episode?)` from `useParams` + `useSearchParams` (same shape `PlayerPage` used today). Fetch metadata (TMDB or AniList) for title display. Call `findBestMatch` → `getGiftedSources` → pick best stream (Auto = highest quality first, fallback chain on error).
- Quality menu: built from `results[].quality`. Switching reloads hls source at the saved `currentTime`.
- Subtitle menu: "Off" + every entry from `subtitles[]`. Inject as `<track>` with `default` only when user-selected; default OFF.
- Audio + Speed menus: keep audio as static placeholder (Gifted doesn't expose tracks), wire Speed to `video.playbackRate`.
- Continue-watching: keep using existing `useLibrary().updateProgress` (drop the broken `useContinueWatching` from the mock).
- Episode nav: reuse current TMDB season/anime episode lookups from `PlayerPage` so prev/next still work.
- Errors: if no match, no sources, or all qualities fail → render the existing error overlay with "Content not available right now" + Retry.

Imports cleaned up: remove `@/lib/anilist/hooks`, `@/lib/store`, `@/components/LazyImage`, `@/lib/format` references; use the existing `getMovieDetails`, `getAnimeDetails`, `useLibrary`, etc.

## 5. Download Modal
New `src/components/DownloadModal.tsx` (shadcn `Dialog`):
- Props: `open`, `onClose`, `type`, `id`, `title`, `season?`, `episode?`.
- On open: call `getGiftedSources` (using the same matched `subjectId`).
- Render one row per `Source`: quality label, formatted size (`bytes/1024² → MB`, `>1024 MB → GB` with one decimal), and a Download button → opens `download_url` in a new tab.
- Loading skeleton + "No download available" empty state.

Wire from `DetailsPage.tsx` (and the anime sub-view): the existing Download icon button currently shows a "Coming Soon" toast — swap it to open `<DownloadModal>`.

## 6. Cleanup / deletions
- Delete: `src/pages/PlayerPage.tsx`, `src/components/HlsPlayer.tsx`, `src/lib/player.ts`, `src/pages/DownloadsPage.tsx`, `src/pages/MovieDetails.tsx`, `src/pages/SeriesDetails.tsx` (legacy, already redirected).
- `src/App.tsx`: remove the `DownloadsPage` import + `/downloads` route; switch `/player/:type/:id` import to the new `Player.tsx`.
- `src/components/BottomNav.tsx`: drop the Downloads tab → 4 tabs (Home, Discover, Library, Me).
- `src/lib/supabase-library.ts`: remove `fetchCloudDownloads` references from UI (table can stay; just unused).
- Update memory `mem://features/streaming-player/channel-system` to reflect single-source Gifted pipeline.

## 7. File map

| File | Action |
|---|---|
| `supabase/functions/gifted-proxy/index.ts` | Create — proxy + CORS + secrets |
| `src/services/giftedApi.ts` | Create — search, sources, match, anime offset |
| `src/pages/Player.tsx` | Rewrite — real HLS player, same UI |
| `src/components/DownloadModal.tsx` | Create — quality list + download |
| `src/pages/DetailsPage.tsx` | Modify — open DownloadModal from Download button |
| `src/App.tsx` | Modify — route `/player/...` to new Player, drop `/downloads` |
| `src/components/BottomNav.tsx` | Modify — remove Downloads tab |
| `src/pages/PlayerPage.tsx` | Delete |
| `src/components/HlsPlayer.tsx` | Delete |
| `src/lib/player.ts` | Delete |
| `src/pages/DownloadsPage.tsx` | Delete |
| `src/pages/MovieDetails.tsx`, `SeriesDetails.tsx` | Delete (legacy) |

## 8. Secrets to add before coding
- `GIFTED_API_KEY`

## 9. Out of scope
- Persisting completed downloads in the `downloads` table (not needed since downloads are direct browser downloads via modal).
- Server-side stream caching.