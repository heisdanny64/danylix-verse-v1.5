

# Cinetaro HLS Player Integration Plan

## Summary
Replace Channel 1 (VidSrc/vsembed) with Cinetaro API + custom HLS player using hls.js. Build a full custom video player with controls and gesture support. Keep Channel 2 (VidLink iframe) unchanged.

## Architecture

```text
Channel 1 (Cinetaro) → fetch API → extract .m3u8 → hls.js → <video> with custom controls
Channel 2 (VidLink)  → iframe (unchanged)
Channel 3            → placeholder (unchanged)

New component: src/components/HlsPlayer.tsx (custom HLS player)
Modified:      src/lib/player.ts (channel config)
Modified:      src/pages/PlayerPage.tsx (conditional render: HLS vs iframe)
New dep:       hls.js
```

## Detailed Steps

### 1. Install hls.js dependency
Add `hls.js` to package.json.

### 2. Update `src/lib/player.ts` — Replace VidSrc with Cinetaro

Change Channel interface to support both iframe and HLS modes:

```ts
export interface Channel {
  id: number;
  name: string;
  label: string;
  disabled: boolean;
  type: "hls" | "iframe";
  sandbox: string;
  allow: string;
  getUrl: (type: "movie" | "tv", tmdbId: number, season?: number, episode?: number) => string;
}
```

- **Channel 1**: `type: "hls"`, `getUrl` returns Cinetaro API endpoint:
  - Movie: `https://apicinetaro.falex43350.workers.dev/movie/${tmdbId}/english`
  - TV: `https://apicinetaro.falex43350.workers.dev/tv/${tmdbId}/${season}/${episode}/english`
- **Channel 2**: `type: "iframe"`, unchanged (VidLink)
- **Channel 3**: unchanged (disabled placeholder)

### 3. Create `src/components/HlsPlayer.tsx` — Custom HLS Video Player

A self-contained component that:

**Props**: `src` (Cinetaro API URL), `onError` (callback for fallback), `onReady`, `isFullscreen`, `onToggleFullscreen`

**HLS Loading**:
- Fetch the Cinetaro API URL
- Extract stream URL from `response.sources[0].file` or `response.stream`
- Validate it's a valid URL (non-null, contains .m3u8 or is a valid media URL)
- If invalid → call `onError()` immediately (triggers Channel 2 fallback)
- Attach to `<video>` element via `Hls.js` (`hls.loadSource()`, `hls.attachMedia()`)
- Native HLS fallback for Safari (`video.src = streamUrl`)

**Custom Controls** (no native `controls` attribute):
- **Play/Pause** button (center-left in control bar)
- **Rewind -10s** / **Forward +10s** buttons
- **Progress slider** — real-time `currentTime/duration`, seekable on drag
- **Volume slider** + mute toggle
- **Fullscreen button**
- **Time display** (current / total)

**Control Visibility System**:
- Auto-hide after 3s of inactivity
- Show on mouse move / tap
- Smooth opacity transition

**Gesture Support (mobile)**:
- Single tap: toggle controls visibility
- Double tap left half: rewind 10s (show brief "-10s" indicator)
- Double tap right half: forward 10s (show brief "+10s" indicator)
- Distinguish single vs double tap with a 300ms delay

**Error Handling**:
- HLS.js error events → call `onError()`
- Fetch failure → call `onError()`
- Video element error → call `onError()`

### 4. Update `src/pages/PlayerPage.tsx` — Conditional Rendering

**Key changes**:

- Import `HlsPlayer` component
- Based on `channel.type`:
  - `"hls"` → render `<HlsPlayer>` instead of iframe
  - `"iframe"` → render iframe (existing logic, unchanged)
- Remove all VidSrc/vsembed references

**Auto-fallback**:
- When HlsPlayer calls `onError`, automatically switch `activeChannel` to Channel 2 (index 1)
- Show a brief toast: "Switching to Channel 2..."
- No user interaction required for fallback

**Shield overlay**:
- Only show for iframe channels (Channel 2), not for HLS player (Channel 1 has custom controls, no ads)

**Fullscreen**:
- For HLS player: fullscreen wraps the video wrapper (same ref), orientation lock logic unchanged
- For iframe: unchanged behavior

**Dev logging**: Keep existing, add Cinetaro API URL and extracted stream URL to log output

### 5. Responsiveness
- HLS player inherits the same `aspect-video rounded-2xl` container
- Custom controls use responsive sizing (smaller buttons on mobile, proper tap targets ≥44px)
- Fullscreen: `fixed inset-0 z-50` with orientation lock (existing logic)
- Controls bar: flex layout that wraps cleanly on small screens

## Files Summary

| File | Action |
|------|--------|
| `package.json` | Add `hls.js` dependency |
| `src/lib/player.ts` | Add `type` field to Channel, replace Ch1 with Cinetaro URLs |
| `src/components/HlsPlayer.tsx` | **New** — Custom HLS player with controls + gestures |
| `src/pages/PlayerPage.tsx` | Conditional HLS vs iframe render, auto-fallback, remove shield for HLS |

No changes to: App.tsx, BottomNav, MovieDetails, SeriesDetails, Index, MovieCard, tmdb.ts, library.ts, CategoryPage, or any other files.

