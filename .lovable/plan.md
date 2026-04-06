

# Full System Restructure Plan

## Overview
Fix content classification (anime detection), type label consistency across pages, profile page redesign, navigation restructure (5-tab with Downloads), and watchlist button responsiveness. No database changes needed — schema is already complete.

## Changes

### 1. `src/lib/tmdb.ts` — Add anime detection helper

Add `detectAndFilterAnime(items: TMDBMovie[]): Promise<TMDBMovie[]>` that:
- For each item, extracts title and searches AniList (batch, with concurrency limit)
- If AniList match found: mark `_isAnimeCard: true`, `media_type: "anime"`, replace poster/metadata with AniList data
- Returns enriched array

Add `excludeAnime(items: TMDBMovie[]): TMDBMovie[]` — filters out items where `_isAnimeCard === true` or `media_type === "anime"`.

Add `limitAnime(items: TMDBMovie[], maxPercent: number): TMDBMovie[]` — caps anime to N% of total.

Update `CATEGORY_MAP` entries to set correct `mediaType` per item's actual `media_type` field (not a single static value). Add a `preserveItemType: true` flag to categories where items carry their own type.

### 2. `src/pages/Index.tsx` — Apply anime detection + distribution rules

**Mixed rows** (Trending Now): Run `detectAndFilterAnime()` on results so anime items get AniList metadata.

**Strict non-anime rows** (Animation, Kids & Teens, Action, Romance, Comedy, Horror, Korean Drama, Japanese Shows): Apply `excludeAnime()` after fetch.

**Global Hits**: Apply `limitAnime()` with 20% cap.

**Anime-only rows**: Already correct (AniList source).

Row order stays as-is (matches Section 4 exactly).

### 3. `src/components/MovieCard.tsx` — Fix type label

Current issue: `const type = mediaType || movie.media_type || "movie"` — the `mediaType` prop overrides the item's actual type.

Fix: Prefer `movie.media_type` when available (it's set per-item), then fall back to `mediaType` prop, then `"movie"`. This ensures each card shows its correct type even in mixed rows.

```ts
const type = movie.media_type || mediaType || "movie";
```

### 4. `src/pages/CategoryPage.tsx` — Fix type labels on View All page

Current bug: passes a single `mediaType` to all cards. Fix: pass each item's own `movie.media_type` or omit `mediaType` prop so MovieCard uses the item's `media_type` field.

For `CATEGORY_MAP` entries with mixed content (e.g., "trending-today", "animation"), don't pass a static `mediaType`. For single-type categories, keep existing behavior.

Add a `mixed` flag to CategoryConfig. When `mixed`, don't pass `mediaType` to MovieCard.

### 5. `src/pages/ProfilePage.tsx` — Complete redesign matching reference UI

Redesign to match the dark Settings/Edit Profile reference:
- **Settings view** (default): User card at top (avatar, name, @username, chevron to edit), followed by grouped settings rows: General Settings, Change Password, About, Terms of Service, Privacy Policy. Large red "Log Out" button at bottom.
- **Edit Profile view** (inline state toggle): Avatar with edit icon, form fields (Full name, Email read-only, Username), green "Save Changes" button, "Delete Account" text button at bottom.
- Remove downloads section from profile page entirely.

### 6. `src/components/BottomNav.tsx` — 5-tab navigation

Update tabs array:
1. Home → `/`