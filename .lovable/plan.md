

# D.Verse Player Upgrade Plan

## Problem Summary
1. **Channel 1 (VidSrc)**: URLs look correct but `vidsrc.xyz` may be down/blocking — need alternative VidSrc domains as fallback
2. **Channel 2 (VidLink)**: The single `sandbox` attribute on line 224 is too restrictive — VidLink needs `allow-popups-to-escape-sandbox` and `allow-presentation`
3. **Gesture overlay on line 233-241** blocks ALL iframe interaction permanently (z-index 10 covers entire iframe) — playback controls inside the embed are unreachable
4. **Fullscreen** doesn't attempt landscape orientation lock on mobile
5. **No per-channel iframe config** — one sandbox rule for all channels

## Changes

### 1. `src/lib/player.ts` — Per-channel iframe config + VidSrc domain fix

Add a `getSandbox()` and `getAllow()` method to each channel, or add `sandbox` and `allow` string fields to the `Channel` interface:

- **Channel 1 (VidSrc)**: Try `vidsrc.icu` as the domain (the `.xyz` domain frequently returns "media unavailable"). Sandbox: `allow-scripts allow-same-origin allow-forms allow-popups`
- **Channel 2 (VidLink)**: Sandbox: `allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation`. This fixes the "disable sandbox" error.
- **Channel 3**: No changes, stays disabled.

Add `sandbox: string` and `allow: string` fields to the `Channel` interface so PlayerPage can read per-channel iframe attributes.

### 2. `src/pages/PlayerPage.tsx` — Smart overlay, per-channel iframe, landscape fullscreen

**Per-channel iframe attributes (lines 218-225)**:
- Read `channel.sandbox` and `channel.allow` instead of hardcoded values
- Remove the single global sandbox string

**Fix gesture overlay (lines 232-241)**:
- The current overlay permanently covers the iframe at z-index 10 with `position: absolute; inset: 0` — this prevents users from ever interacting with the embedded player's own play button
- Replace with a **dismissable shield**: overlay starts visible (absorbs first tap to reduce ads), then on first tap it hides itself (`pointerEvents: none`) and shows a small "re-shield" button. User can re-enable the shield if needed.
- This balances ad reduction (absorbs initial click) with usability (player becomes interactive after first tap)

**Landscape fullscreen (lines 103-111)**:
- After `requestFullscreen()`, attempt `screen.orientation.lock('landscape')` wrapped in try/catch
- On `fullscreenchange` exit, attempt `screen.orientation.unlock()` wrapped in try/catch
- Add fullscreen-specific CSS: when `isFullscreen`, the video wrapper gets `fixed inset-0 z-50 rounded-none` classes to fill the screen properly

**Player state management**:
- Add `playerState` enum: `'loading' | 'ready' | 'error'`
- On iframe load event, set to `'ready'`; use `onError` or a timeout (8s) to detect failures and set `'error'`
- Error state shows: channel name, "Source unavailable" message, Retry button, Switch Channel buttons

**Dev logging**:
- In `import.meta.env.DEV` mode, log channel name, built URL, mediaType, tmdbId, season/episode, sandbox config when URL changes

### 3. Files Summary

| File | Changes |
|------|---------|
| `src/lib/player.ts` | Add `sandbox` and `allow` fields per channel; try `vidsrc.icu` for Ch1; keep VidLink URLs |
| `src/pages/PlayerPage.tsx` | Per-channel iframe attrs; dismissable shield overlay; landscape fullscreen with orientation lock; player error/loading states with retry; dev logging |

No changes to: App.tsx, BottomNav, MovieDetails, SeriesDetails, Index, MovieCard, tmdb.ts, library.ts, or any other files.

