# Maintenance Mode Setup

## Goal
Put the live site into maintenance mode with a branded "/" landing page, while keeping Privacy + Terms reachable (for Google's policy/indexing requirements) and keeping the real app accessible at `/home` for continued development.

## Routing Changes (`src/App.tsx`)

New route map:
- `/` → new `MaintenancePage`
- `/home` → existing `Index` (current homepage, untouched)
- `/privacy` → existing `Privacy` (kept)
- `/terms` → existing `Terms` (kept)
- **All other routes** (`/search`, `/details/*`, `/player/*`, `/category/*`, `/recommendations`, `/library`, `/auth`, `/profile`, `/settings`, `/about`, `/movie/:slug`, `/tv/:slug`, `/anime/:slug`, legacy redirects, and `*`) → `<Navigate to="/" replace />`

This is implemented by replacing the current `<Routes>` block with the four allowed routes + a catch-all `<Route path="*" element={<Navigate to="/" replace />} />`. `TopNav` and `BottomNav` will be conditionally hidden on `/` so the maintenance page is full-bleed (Privacy/Terms keep them as today).

## New File: `src/pages/MaintenancePage.tsx`

Layout:
- Full-viewport dark background with animated effects (see below).
- Centered content stack:
  - **D. Verse** text logo — "D." in white, "Verse" in `hsl(var(--primary))` (matches existing `.logo-d` / `.logo-verse` styling already in `index.css`).
  - Headline: "We'll be right back."
  - Sub-copy: short message that the site is under maintenance while new updates are being rolled out, with a subtle pulsing dot.
  - Small "Follow updates" hint (no link unless you want one — I'll leave it as static text).
- Same footer as the current homepage (Privacy • Terms + © 2026 D. Verse) reproduced verbatim so it remains crawlable.

Background animations (Tailwind + a couple of small `@keyframes` added to `index.css`):
- Two large, slow-floating violet/indigo radial gradient blobs (blur-3xl, `animate-pulse` with custom durations, offset positions).
- A subtle starfield / noise overlay using a CSS radial-gradient pattern at low opacity.
- Animated gradient ring behind the logo using `bg-gradient-to-r` + a slow `animate-spin` (very slow, ~20s) masked to a ring.
- Logo fade-in + subtle float using the existing `fade-in` keyframe already defined in `index.css`.

All colors pulled from existing tokens (`--primary`, `--background`, `--foreground`, `--muted-foreground`) — no hardcoded hex.

## SEO / Indexability

Goal: Google still indexes the site properly while we're in maintenance.

- **Do NOT add `noindex`** anywhere — the maintenance page itself should be indexable, and Privacy/Terms must stay indexable for policy review.
- **Do NOT return any HTTP error / 503** — this is a client-side SPA, the page returns 200 normally, which is what we want for continued indexing during a short maintenance window.
- Update `index.html` `<title>` and `<meta name="description">` to reflect the maintenance state (e.g. `D. Verse — Under Maintenance` / "D. Verse is undergoing scheduled maintenance. We'll be back shortly."). Keep canonical + og tags.
- `public/robots.txt` already allows all crawlers — leave unchanged.
- The footer links to `/privacy` and `/terms` give crawlers two additional indexable pages, matching today's setup.

## Files Touched

1. `src/App.tsx` — new route map, conditionally hide `TopNav`/`BottomNav` on `/`.
2. `src/pages/MaintenancePage.tsx` — new file.
3. `src/index.css` — add 2–3 small keyframes for blob float / slow spin (additive, no theme changes).
4. `index.html` — update `<title>` + meta description for maintenance state.

## Out of Scope

- No changes to `vercel.json`, `sw.js`, or any backend.
- No changes to existing pages' internals — they're just unreachable except via `/home`, `/privacy`, `/terms`.
- No "Subscribe for updates" form unless you ask for it.

## Reverting Later
To exit maintenance: in `App.tsx`, swap `/` back to `Index`, remove `/home`, and restore the original `<Routes>` block. One-file revert.
