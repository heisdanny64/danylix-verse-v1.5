## Goal

Align streaming with the Gifted API contract: the `stream_url` returned by `sources` is already a fully playable, proxied URL. Stop decoding, re-proxying, or rebuilding it. Just hand it to the player.

## What's wrong today

`src/pages/Player.tsx` and `src/services/giftedApi.ts` implement a 3-tier fallback chain that:

1. Calls `extractDirectUrl(stream_url)` to pull out and `decodeURIComponent` the inner `?url=` param, and tries that first.
2. Falls back to the proxy `stream_url` if the direct URL fails.
3. Falls back to `download_url` as a third "stream" tier.

Per the new rule, the stream URL must be used **exactly as returned**. The decoding step often pulls out a signed/origin-locked URL the browser can't play, the download fallback isn't a real streaming source, and the whole chain hides the real failure cause.

## Changes

### 1) `src/services/giftedApi.ts`
- Delete the `extractDirectUrl` helper entirely (and its export).
- Leave `getGiftedSources`, `findBestMatch`, `resolveAnimeEpisode`, `formatBytes` untouched.

### 2) `src/pages/Player.tsx`
- Remove the `extractDirectUrl` import.
- Remove `sourceTier` state and the `directUrl` / `downloadUrl` derivations used as alternate sources.
- `streamUrl` becomes simply `activeSource?.stream_url || ""` — no transformation, no conditional tier selection.
- Remove the `useEffect` that resets `sourceTier` based on `directUrl`.
- Remove `advanceFallback` + `advanceFallbackRef`. Replace the on-error and HLS-fatal-error handlers with:
  - Log the error with `video.error.code/message/currentSrc` and (for HLS) `data.type/details/fatal` — required diagnostic visibility.
  - If `qualityIdx + 1 < sources.length`, advance to the next quality (preserve position + play state, which already happens via the existing effect on `qualityIdx`).
  - Otherwise set `streamError = true` and stop.
- Update the source-load `useEffect` dependency array to drop `sourceTier` and `directUrl`/`downloadUrl` references.
- Keep the diagnostic `console.log("[Player] Loading source", { quality, streamUrl })` (drop the `tier`/`hasDirect`/`hasDownload` fields).
- Keep all existing UI: quality menu, subtitles (already loaded as multi-track and toggled via `textTracks[i].mode`), speed, auto-next, resume, cloud progress sync.

### 3) Quality + subtitle behavior — verify, no rewrite needed
- Sources are already sorted descending by resolution; `qualityIdx = 0` = highest = "Auto". Confirmed already correct.
- Quality switch already preserves `position` and play-state via `wasPlayingRef` + `resumeRef`. Keep as-is.
- Subtitles already render one `<track>` per language with `default` on `lan === "en"` and toggle visibility via `textTracks[i].mode`. Keep as-is.

### 4) Headers note
HTML5 `<video>` and `hls.js` (default loader) cannot attach custom `User-Agent` / `Referer` / `Origin` headers from the browser — those are forbidden header names and are controlled by the browser. We will **not** add a custom fetch layer for this. The Gifted proxy URL is designed to work without them. No header code changes.

### 5) Diagnostics retained
- `console.log("[Player] Loading source", { quality, streamUrl })` before assignment.
- `console.error("[Player] VIDEO ERROR", { code, message, currentSrc })` on `video.error`.
- `console.error("[Player] HLS error", { fatal, type, details })` on hls.js fatal.

## Files touched

- `src/services/giftedApi.ts` — remove `extractDirectUrl`.
- `src/pages/Player.tsx` — remove tier/fallback logic; use `stream_url` as-is; on error, only try next quality.

## Not touched

- `supabase/functions/gifted-proxy/index.ts` — unchanged.
- TMDB / AniList metadata layer.
- Player UI, subtitles, qualities menu, downloads, library/cloud sync, auth, navigation.
