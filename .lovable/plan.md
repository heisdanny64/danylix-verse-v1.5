## Goal

Fix streaming, polish the existing custom Player, and add a real Discover experience and a season/episode download UX — without disturbing the working Gifted API integration, downloads, subtitles, qualities, or auth.

---

## 1) Streaming fix — diagnose first, then act

Before changing playback code, instrument it and read real signals.

### Diagnostics (added to `src/pages/Player.tsx` and `gifted-proxy`)

1. Log the resolved subjectId, the full `getGiftedSources` response, and the chosen `streamUrl` right before `hls.loadSource` / `video.src = ...`.
2. Add a real `video.onerror` reporter that prints `video.error.code`, `video.error.message`, and `video.currentSrc`.
3. In the edge function `gifted-proxy`, log upstream `status`, `content-type`, and the first 200 chars of the body when `!upstream.ok`. Return structured JSON like `{ error, status, fallback: status >= 500 }` with HTTP 200 for fallbackable errors so the client can read the body (current code returns 502, which surfaces as "Failed to proxy stream" generically).
4. Run a live request via `supabase--curl_edge_functions` to `gifted-proxy` for a known-failing title to capture the real upstream payload and headers, and check `supabase--edge_function_logs` after a player attempt.

### Conditional fixes (only applied based on diagnostic findings)

- **Case A — Proxy URL plays directly:** keep current behavior, no changes.
- **Case B — `stream_url` contains an encoded `?url=` param and the decoded URL plays in a plain `<video>`:** add a helper `extractDirectUrl(streamUrl)` that parses the URL, finds an `url=` query param, `decodeURIComponent`s it, and returns it; try the direct URL first, fall back to the proxied URL on `error`.
- **Case C — Decoded URL returns "Access Denied" / signed:** keep proxy URL, do not decode.
- **Case D — Wrong `Content-Type` from upstream / playback issue:** set `video.src = streamUrl`, `video.setAttribute('type', 'video/mp4')`, `video.load()` for non-HLS sources; we already use hls.js for `.m3u8`.
- **Case E — CORS issue:** `<video>` already has `crossOrigin="anonymous"`; if CORS is the cause, drop `crossOrigin` for non-HLS direct files (subtitle `<track>` will still need CORS — handle by fetching subtitle via the proxy and converting to a Blob URL).
- **Case F — All fail for chosen quality:** existing fallback (try next `qualityIdx`) stays; only after all qualities fail we try `download_url` as a last resort source, and only then surface the fatal error.

This is a structured diagnostic flow — no speculative rewrites until logs confirm the cause.

---

## 2) Player source & subtitle handling (`src/pages/Player.tsx`)

Small enhancements on top of the existing player:

- **Default = highest quality.** Sources are already sorted descending; ensure `qualityIdx` defaults to `0` and the "Auto" label still maps to highest. (Already the case — verify and keep.)
- **Quality switch preserves time + play state.** Capture `position` and `playing` before swap, then on `loadedmetadata` set `currentTime = saved` and call `play()` if it was playing. (Currently we only preserve `position`; add play-state preservation.)
- **Subtitles: load all tracks as switchable, not as `<track>` swap.** Render one `<track>` per subtitle with `default` set on the English entry (`lan === "en"`), and toggle visibility by setting `video.textTracks[i].mode = i === subtitleIdx ? "showing" : "disabled"`. This avoids re-mounting `<video>` on subtitle changes.
- Subtitle `label` = `lanName`, `srcLang` = `lan`, `default` = `lan === "en"`.

---

## 3) Discover page — full implementation (`src/pages/RecommendationsPage.tsx`)

Replace current contents. **No hero banner.**

### Top: genre chips

- Horizontal scroll row of chips with a Lucide icon + label (no emojis):
  Action (Swords), Drama (Drama), Comedy (Smile), Thriller (Skull), Sci-Fi (Rocket), Horror (Ghost), Romance (Heart), Animation (Sparkles), Anime (Tv), Documentary (FileVideo), Family (Users).
- Multi-select up to **3**; click toggles. Active chips have primary bg.

### Feed

- Combined feed mixing **Trending + Popular + Top Rated + Now Playing/Airing** across movies, TV, and AniList anime.
- Apply selected genre filter: TMDB calls use `with_genres`; if "Anime" is one of the active chips, include AniList trending/popular results (mapped via `animeToCard`).
- Hard exclude content older than **1995** (filter on `release_date`/`first_air_date`/anime `year`).
- Mild shuffle within each loaded batch to avoid repeating ordering patterns.
- **Infinite scroll** via `IntersectionObserver` (same pattern as `CategoryPage`). No pagination UI.
- Grid: `grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6`. Reuse `MovieCard` (existing type badges shown automatically).
- URL syncs selected chips: `/recommendations?genres=action,drama` so the homepage "View All" handoff (#4) can pre-select.

### Search shortcut

Keep the existing top search bar pattern (link to `/search`) above chips for consistency.

---

## 4) "View All" → Discover handoff

- `MovieRow` "View All" already links to `/category/:slug`. Update `CategoryPage` to:
  - Cap displayed items at **30** (stop loading after 30 unique cards).
  - At the bottom, render a **"View More in Discover"** button → navigates to `/recommendations?genres=<mapped>` where the slug maps to a genre chip (e.g. `action` → `action`, `horror` → `horror`, `comedy` → `comedy`, `romance-drama` → `romance,drama`, `korean-dramas` → no genre but `lang=ko`, `trending-*` → no preset).
- Add a small `slug → discoverParams` map in `CategoryPage`.

---

## 5) Episode download UI (`src/components/DownloadModal.tsx`)

For `type === "tv"` or `"anime"`, redesign modal contents:

```text
┌──────────────────────────────────────┐
│ Download · Title                     │
├──────────────────────────────────────┤
│ Quality:  [ 1080p ] [ 720p ] [480p]  │
│ Season:   [ Season 1   ▾ ]           │
│ ┌──────────────────────────────────┐ │
│ │ ☐ Select All                     │ │
│ │ ☐ Episode 1     720p · 280 MB    │ │
│ │ ☐ Episode 2     720p · 290 MB    │ │
│ │ ☐ Episode 3     720p · 275 MB    │ │
│ │ ...                              │ │
│ └──────────────────────────────────┘ │
│ [ Download N episodes ]              │
└──────────────────────────────────────┘
```

- **Quality pills** at top — derived from the first probed episode's available qualities (cached).
- **Season dropdown** — for TV: from `getMovieDetails(...).seasons`. For anime: only Season 1.
- **Episode list** — for TV: `getSeasonDetails(id, season).episodes`. For anime: 1..`anime.episodes`. Each row has a Checkbox + episode label + (lazy) size for the chosen quality.
- **Select All** checkbox toggles all.
- **Download button** at bottom, disabled until ≥1 episode selected. Sequential downloads with a progress indicator (`Downloading 2/5 · Episode 3`). Triggers anchor download per episode (existing `triggerDownload`).
- **Size formatting** via existing `formatBytes`: `< 1024 MB` → MB, otherwise GB with 2 decimals (update `formatBytes` to 2 decimals for MB-range too as spec requires).
- For anime, episode resolution uses `resolveAnimeEpisode` so the API receives absolute episode numbers.

For `type === "movie"` the modal stays as today.

---

## 6) Continue Watching cloud sync (Supabase)

Schema is already in place (`continue_watching` table). What's missing:

- **Persist `currentTime` + `duration`**, not only `progress %`. Add columns `current_time real`, `duration real` via a migration. Required so we can resume to exact second instead of recomputing from %.
- In `Player.tsx`, persist on:
  - timer every **7s** during playback (current is 5s — fine to keep at 5–10s),
  - `pause` event,
  - `beforeunload` and route-change cleanup (use `navigator.sendBeacon` fallback to `supabase` insert).
- On player mount: read existing `continue_watching` row for `(userId, content_id, content_type)` and seed `resumeRef.current = currentTime` so `loadedmetadata` resumes exact position. Today we only seed from quality switches.
- Guard everything with `userId` (already done in `library.ts`), all rows are tied to `auth.uid()` via existing RLS.
- **Watch history**: introduce `watch_history` table (append-only) with `user_id, content_id, content_type, season, episode, watched_at`; insert one row each time playback starts.
- **Search history**: add `search_history` table (`user_id, query, searched_at`); write from `SearchPage` on submit.
- **User preferences**: add `user_preferences` (`user_id PK, preferred_subtitle_lang, preferred_quality, autoplay_next bool`); read in Player to drive defaults.
- All new tables: RLS `auth.uid() = user_id` for select/insert/update/delete, mirrored from existing `continue_watching` policies.

Library is already cloud-synced; no changes there beyond piping the new fields through `supabase-library.ts`.

---

## 7) Download link exposure

Per instruction: leave as-is. No proxying of `download_url`, no obfuscation.

---

## Files to change

- `src/pages/Player.tsx` — diagnostics, source fallback chain, multi-track subtitles, exact-second resume, beacon save.
- `supabase/functions/gifted-proxy/index.ts` — richer logging, structured error JSON, return 200 for fallbackable upstream errors.
- `src/services/giftedApi.ts` — add `extractDirectUrl` helper; keep formatBytes 2dp.
- `src/pages/RecommendationsPage.tsx` — full rewrite (Discover).
- `src/pages/CategoryPage.tsx` — 30-item cap + "View More in Discover" CTA + slug→discover map.
- `src/components/DownloadModal.tsx` — new layout for TV/anime with quality pills, season dropdown, episode checkboxes, sequential downloader.
- `src/lib/supabase-library.ts` — extend continue-watching with `current_time`, `duration`; add helpers for `watch_history`, `search_history`, `user_preferences`.
- `src/lib/library.ts` — pipe new fields through the hook.
- `src/pages/SearchPage.tsx` — write to `search_history` on submit.

### Migrations

1. `alter table continue_watching add column current_time real, add column duration real;`
2. Create `watch_history`, `search_history`, `user_preferences` with RLS policies (`auth.uid() = user_id`).

## What I will NOT touch

- `gifted-proxy` core auth/key handling, the API contract, or `GIFTED_API.md`.
- Auth flow, profiles table, `BottomNav` 4-tab structure, `Index` homepage rows.
- Player UI styling/design — only behavior fixes inside the existing layout.
