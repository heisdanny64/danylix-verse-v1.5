
# Player Polish & Continue Watching Completion

Targeted fixes to `src/pages/Player.tsx`, `src/lib/library.ts`, `src/lib/supabase-library.ts`, and `src/components/ContinueWatchingRow.tsx`. Streaming/HLS source-loading logic stays untouched.

## 1. Remove all gesture handlers

In `Player.tsx`:
- Delete `handleTap`, `tapTimerRef`, `tapCountRef`, `lastTapXRef`, `seekIndicator` state and its overlay JSX.
- Replace container `onClick={handleTap} onTouchEnd={handleTap}` with a simple click handler that toggles `showControls` only (ignored when target is inside `[data-controls]` / `[data-settings]`).
- Keep `flashControls` (still used by buttons / mousemove).

## 2. Draggable seek bar

Replace the click-only progress bar (lines 803-813) with a true draggable slider.

State:
- `isSeeking: boolean`
- `seekPreview: number` (seconds)

Behavior:
- `onPointerDown` on the bar: `setPointerCapture`, `isSeeking=true`, pause video (remember `wasPlayingRef`), compute & set `seekPreview` from clientX.
- `onPointerMove` (while `isSeeking`): update `seekPreview` only — never write `video.currentTime`.
- `onPointerUp` / `onPointerCancel`: `video.currentTime = seekPreview`, resume if `wasPlayingRef`, `isSeeking=false`.
- In `timeupdate` listener: if `isSeeking`, ignore (`setPosition` skipped).
- Bar fill / thumb / time label use `isSeeking ? seekPreview : position`.
- Single shared implementation works for mouse + touch via Pointer Events.

## 3. Subtitles: SRT→VTT conversion + activation

New helper `src/lib/subtitles.ts`:
```ts
export async function srtUrlToVttBlobUrl(url: string): Promise<string>
```
- Fetch text, detect `WEBVTT` header — if present return the URL unchanged.
- Otherwise convert: prepend `WEBVTT\n\n`, replace `,` → `.` in timestamps (`/(\d\d:\d\d:\d\d),(\d{3})/g`), strip lone numeric index lines.
- Wrap in `Blob([...], { type: "text/vtt" })`, return `URL.createObjectURL(blob)`.

In `Player.tsx`:
- Add `useQuery(["subs-vtt", subtitles])` (or `useEffect`) that maps each `GiftedSubtitle` to a converted blob URL; revoke on cleanup.
- Render `<track>` per subtitle using the converted URL; remove `default` attribute (we drive activation manually).
- Existing effect that sets `tracks[i].mode` already handles activation — keep it; add: when subtitles first load, auto-select index of `lan === "en"` if any (default-on English) by setting `subtitleIdx`.
- Add CSS in `src/index.css`:
  ```css
  ::cue { color:#fff; background:transparent; font-family:system-ui,sans-serif; font-size:14px; text-shadow:0 1px 2px rgba(0,0,0,.6); }
  ```

## 4. Quality handling

Already sorted desc and preserves position (lines 144-150, 369-374). Confirm `qualityIdx` defaults to `0` (highest). No change required beyond keeping the existing logic intact.

## 5. Next-episode highlight at 80%

In `Player.tsx`:
- `const [nextHighlighted, setNextHighlighted] = useState(false)`
- Reset to `false` whenever `episode`/`season` changes.
- In `timeupdate` handler (or derived effect on `position`/`duration`): if `hasNext && !nextHighlighted && duration>0 && position/duration >= 0.8` → `setNextHighlighted(true)`.
- Apply conditional classes to the existing "Next Episode" button: `bg-primary text-primary-foreground scale-105 shadow-[0_0_20px_hsl(var(--primary)/0.6)]` with a `transition-all`.

## 6. Continue Watching — complete the loop

### Schema
Existing `continue_watching` already has `current_time_sec`, `duration_sec`, `progress`, season/episode, poster, title — sufficient. **No migration needed.** Treat this as the `watch_progress` table referenced in the brief.

### Tracking (`Player.tsx`)
Replace the current 5-second persist effect:
- Compute `pct = (position / duration) * 100` from real values (no estimates).
- Upsert with `onConflict: "user_id,content_id,content_type"` so first-watch rows get created (current `.update()` silently no-ops if row missing).
- Persist on: 5s interval, `pause`, `ended`, and `beforeunload` / cleanup.
- If `pct >= 90`: delete row from `continue_watching` (mark complete, removes from row).
- Always update local `useLibrary` via `updateProgress` so homepage reacts immediately.

### Smart resume
Already implemented (lines 387-409) — keep. Ensure resume seeks even if `current_time_sec` exists but no row matches season/episode (already guarded).

### `useLibrary` (`src/lib/library.ts`)
- Make `updateProgress` accept `currentTime` & `duration` and forward them to `updateCloudProgress`.
- `activeContinueWatching` filter: `progress < 90` (was `< 100`) to match completion rule.

### `supabase-library.ts`
- Extend `updateCloudProgress` signature with optional `currentTime`, `duration`; include in upsert payload.
- `fetchCloudContinueWatching`: order by `updated_at desc` (already), `.limit(20)`.

### `ContinueWatchingRow.tsx`
- Already shows poster, title, progress bar, episode label — keep.
- Ensure click goes to player (it does); resume comes from cloud seed.
- Make progress bar use the real `item.progress` (already does).

### Library page
Add the same row at the top of `LibraryPage.tsx` if not present (verify during implementation; render `<ContinueWatchingRow />`).

## 7. Player icon fix

In `Player.tsx`:
- Import `Maximize`, `Minimize` from `lucide-react`; drop unused `RotateCw`.
- Floating fullscreen button (line 710): render `isFullscreen ? <Minimize/> : <Maximize/>`.

## 8. Out of scope (do not touch)
- `streamUrl` / HLS loading / fallback / decoding
- `services/giftedApi.ts`, `gifted-proxy` edge function
- Download system, TMDB, AniList, search

## File touch list
- `src/pages/Player.tsx` — gestures removed, slider drag, subtitle blob URLs + auto-EN, 80% highlight, Maximize/Minimize icon, persist/upsert + complete-at-90.
- `src/lib/subtitles.ts` — new SRT→VTT helper.
- `src/index.css` — `::cue` styling.
- `src/lib/library.ts` — pass currentTime/duration through; complete threshold 90.
- `src/lib/supabase-library.ts` — upsert with time fields; limit 20.
- `src/pages/LibraryPage.tsx` — ensure ContinueWatchingRow is rendered (verify only).
