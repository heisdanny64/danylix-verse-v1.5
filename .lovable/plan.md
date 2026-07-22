## Scope

Refinement pass on an existing app. No rewrites of streaming logic, TMDB layer, or Supabase schema. Each item is fully implemented end-to-end — no placeholders.

---

## 1. Navigation & Layout

**`src/pages/Index.tsx`**
- Remove the `<header className="absolute …">` block. The `D.Verse` wordmark already lives in `TopNav` (desktop) and we'll show a thin mobile header in normal flow above the hero on small screens (no absolute positioning).
- Wrap page content so hero comes after nav in document order.

**`src/components/TopNav.tsx`**
- Logo: replace `D.VERSE` text with `D. Verse` exactly. Drop `tracking-tight` uppercase styling and ensure no `uppercase` Tailwind class is applied.
- Already `sticky top-0 z-50`. Audit ancestors (`#root`, `body`, route wrappers) for `overflow-hidden` / `transform` that breaks sticky — none currently set, but add `overflow-x-clip` instead of `hidden` on any wrapper that needs it.
- Add a mobile variant: a slim sticky bar (logo + search icon + profile) shown `md:hidden` so the wordmark sits above the hero on phones too. Keeps single source of truth for nav.

**Stacking**
- Hero `z-0`, TopNav `z-50`. Index page becomes: `<TopNav />` (already mounted in `App.tsx`) → `<HeroBanner />` → rows. Remove `absolute` header so hero starts below nav naturally.

---

## 2. Horizontal Row Scroll Buttons (Desktop only)

**`src/components/MovieRow.tsx`**
- Add a scroll container ref. Render two `<button>` overlays (`ChevronLeft` / `ChevronRight`) absolutely positioned on the row's left/right edges, only visible at `md:` and up (`hidden md:flex`).
- Click handler: `el.scrollBy({ left: ±el.clientWidth * 0.85, behavior: "smooth" })`.
- Track scrollLeft + scrollWidth via a `scroll` listener; hide left button at `scrollLeft<=0`, hide right at end. Use opacity transition so they fade.
- Keep `scrollbar-hide`. No change to mobile touch behavior.

---

## 3. Full PWA

**`index.html`**
- Viewport: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover` (disables pinch + double-tap zoom).
- Add `<meta name="mobile-web-app-capable" content="yes" />` alongside the existing Apple equivalent.

**`public/manifest.json`**
- Already has `display: "standalone"`, theme/bg color, icons. Add: `"display_override": ["fullscreen", "standalone"]`, `"id": "/"`, `"prefer_related_applications": false`.
- Verify icon files exist at the referenced paths (`favicon-192x192.png`, `favicon-512x512.png`); if not, point to existing `favicon-192.png`/`favicon-32.png` in `public/`.

**Safe-area / notch**
- `src/index.css`: add CSS env-var helpers
  ```css
  body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
  .safe-x { padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }
  ```
- Bottom nav: add `pb-[env(safe-area-inset-bottom)]`. Top nav: `pt-[env(safe-area-inset-top)]`.

**Service worker**
- Per Lovable PWA guidance: do **not** add `vite-plugin-pwa` (preview iframe issues). Manifest-only setup gives true installability + standalone launch on iOS/Android, which covers the user's stated goals (full-screen, no zoom, safe area, installable). No offline caching is in scope.

---

## 4. Authentication UI

**`src/pages/AuthPage.tsx`** — restructure to match the Crunchyroll-style reference (large centered title, underline-style inputs, single bold pill button, secondary tab link below).

- Login form: **Email or Username** + **Password** + `LOG IN` button. Below: `FORGOT PASSWORD?` and `CREATE ACCOUNT` links (the latter switches tab).
- Signup form: **Username** + **Email** + **Password** + `CREATE ACCOUNT` button. Below: `Already have an account? LOG IN`.
- Drop the `name` and `confirmPassword` fields per spec. Update `signUp(username, email, password)` accordingly in `AuthContext`.
- Validation: username regex (existing), email format, password ≥6. Inline error component preserved.
- Style: dark bg, large title, input with bottom border + focus highlight, full-width pill button.

**`src/contexts/AuthContext.tsx`**
- Adjust `signUp` signature; profile row: set `name = username` (or omit) so DB stays satisfied without breaking existing schema. No migration needed.

---

## 5. Profile Page

**`src/pages/ProfilePage.tsx`**
- Replace stub `onClick={() => {}}` rows with real navigation.
- Add new routes in `App.tsx`: `/about`, `/terms`, `/privacy`, `/settings`.

**New static pages** (`src/pages/About.tsx`, `Terms.tsx`, `Privacy.tsx`)
- Standard layout: back button header + scrollable prose. Realistic copy generated for each (mission/about, ToS sections: acceptance, accounts, content, IP, termination, disclaimer, contact; Privacy: data collected, usage, cookies, third-parties, rights, contact).

**New `src/pages/SettingsPage.tsx`** — "General Settings" route
- Three controls:
  - **Preferred video quality** — Auto / 1080p / 720p / 480p / 360p (Select).
  - **Preferred subtitle language** — sourced from a fixed list (English, Spanish, French, German, Japanese, Portuguese, Arabic, Hindi, …) (Select).
  - **Subtitle size** — Small / Medium / Large (segmented buttons).
- Persist to `localStorage` key `dverse_player_prefs` (JSON). Also mirror to Supabase `user_preferences` if user logged in (new helper, optional — local first).

**New hook `src/hooks/usePlayerPrefs.ts`**
- `usePlayerPrefs()` returns `{ quality, subtitleLang, subtitleSize, set… }` reading from localStorage with defaults (`Auto`, `English`, `small`).

**`src/pages/Player.tsx`** wiring
- On mount, read prefs:
  - When sources resolve, pre-select the best matching quality (closest to pref ≤ pref).
  - When subtitles list resolves, pre-select track matching pref language (case-insensitive).
  - Apply subtitle size by writing to a CSS variable on the player root: `--cue-scale: 0.9 | 1.0 | 1.25` and styling `::cue` / the custom subtitle overlay font-size accordingly.

---

## 6. Details Page — Slug URLs + Share

**Slug routing**
- Add helper `src/lib/slug.ts`: `toSlug(title)` → kebab; `parseSlug("the-matrix-603")` → `{ slug, id: "603" }` (id = trailing numeric/string after last `-`).
- New route in `App.tsx`: `<Route path="/:type/:slug" element={<DetailsPage />} />` accepting types `movie | tv | anime`. Keep existing `/details/:type/:id` as a permanent redirect to the slug URL once title is known.
- `MovieCard` link generation: build `/${type}/${toSlug(title)}-${id}` and append `?source=gifted` only when needed (kept in query string, NOT path, so source stays internal — but to fully hide source we can store a session map id→source in `sessionStorage` keyed by id; if absent, source defaults to TMDB; gifted ids are non-numeric so detection is implicit). Final approach: detect `isNaN(id)` ⇒ gifted; otherwise TMDB. **No `?source=` in the URL.**
- `DetailsPage` + `Player`: derive `source` from `Number.isFinite(Number(id)) ? "tmdb" : "gifted"`. Removes the leak.

**Share button**
- New `src/components/ShareButton.tsx`. On click:
  ```ts
  const url = `${window.location.origin}/${type}/${slug}-${id}`;
  if (navigator.share) await navigator.share({ title, url, text: overview });
  else { await navigator.clipboard.writeText(url); toast("Link copied"); }
  ```
- Render in `DetailsPage` action bar next to Watchlist/Download. Works for all content types and never includes source info.

---

## 7. Continue Watching — Gifted Support

**`src/lib/library.ts`**
- `ContinueWatchingItem.movie.id` is typed `number`; gifted ids are strings. Change the persisted shape to allow `id: string | number`. Update `cloudToLocalContinue` to keep raw `content_id` string instead of coercing to `0`.
- `updateProgress` already accepts `TMDBMovie`; relax internal typing to accept gifted-shaped items (id string, poster absolute URL).
- `removeFromContinue` keyed on `id + mediaType` — change comparator to string-equality on `String(id)`.

**`src/lib/supabase-library.ts`**
- `content_id` column is already `text` (per existing usage). Confirm no numeric cast on insert; pass `String(id)` consistently.

**`src/pages/Player.tsx`**
- Where it calls `updateProgress(movie, mediaType, …)`, pass the gifted-derived movie object when `isGiftedSource` (build `{ id: stringId, title, poster_path: absoluteUrl, … }` from `giftedDetail`). Keep TMDB path unchanged.

**`src/components/ContinueWatchingRow.tsx` / `MovieCard`**
- When item id is non-numeric, route resume click to `/${type}/${slug}-${id}` (gifted) — slug system makes this transparent. Resume uses persisted `season/episode/currentTime`.

---

## 8. Source Abstraction Audit

- Remove the `?source=gifted` query param everywhere it's currently emitted (MovieCard, DetailsPage Watch button). Replace with id-based detection (gifted ids are non-numeric strings).
- Remove the `"gifted"` source label or any UI text that exposes provider. Verify badges in `MovieCard`, `DetailsPage`, search filter chips don't mention gifted (search chips already trimmed per prior plan; double-check).

---

## Files Touched

```text
index.html                                  - viewport zoom-lock
public/manifest.json                        - id, display_override, fix icon paths
src/index.css                               - safe-area helpers, ::cue size vars
src/App.tsx                                 - new routes (about/terms/privacy/settings, slug)
src/components/TopNav.tsx                   - logo casing, mobile slim variant
src/components/BottomNav.tsx                - safe-area padding
src/components/MovieRow.tsx                 - desktop scroll buttons
src/components/MovieCard.tsx                - slug URL builder, no ?source
src/components/HeroBanner.tsx               - slug URL for play/details
src/components/ContinueWatchingRow.tsx      - gifted-aware resume routes
src/components/ShareButton.tsx              - NEW
src/contexts/AuthContext.tsx                - signUp signature (drop name)
src/hooks/usePlayerPrefs.ts                 - NEW
src/lib/slug.ts                             - NEW
src/lib/library.ts                          - string ids, gifted progress
src/lib/supabase-library.ts                 - ensure string content_id
src/pages/Index.tsx                         - drop absolute header
src/pages/AuthPage.tsx                      - redesigned per reference
src/pages/ProfilePage.tsx                   - wire row navigation
src/pages/SettingsPage.tsx                  - NEW
src/pages/About.tsx                         - NEW
src/pages/Terms.tsx                         - NEW
src/pages/Privacy.tsx                       - NEW
src/pages/DetailsPage.tsx                   - id-based source detect, share btn, slug
src/pages/Player.tsx                        - id-based source, prefs wiring, gifted CW
```

No changes to: streaming/HLS logic, TMDB metadata fetchers, Supabase schema, downloads.
