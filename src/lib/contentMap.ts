/**
 * contentMap.ts — Clean Gifted ↔ TMDB mapping layer.
 *
 * Responsibilities:
 *  1. Manual overrides — hardcoded known-good subjectIds for problem titles
 *  2. Title normalization — symmetric, punctuation-only stripping (no article removal)
 *  3. Matching — exact/near-exact title + year comparison, fails cleanly on no match
 *  4. localStorage cache with 10-minute TTL per entry
 */

import { searchGifted } from "@/services/giftedApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MapOptions {
  title: string;
  year?: number | null;
  type: "movie" | "tv";
  tmdbId: number;
}

interface CacheEntry {
  subjectId: string | number;
  ts: number; // Date.now() when cached
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_KEY = "dverse_content_map_v1";
const TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Manual overrides — key is "type:tmdbId", value is the Gifted subjectId.
 * Add entries here when users report wrong mapping for a specific title.
 * These bypass search entirely and are never evicted from cache.
 *
 * Format: "movie:603": "giftedSubjectIdHere"
 *         "tv:94605":  "giftedSubjectIdHere"
 */
const MANUAL_OVERRIDES: Record<string, string | number> = {
  // Add problem titles here as they're reported:
  // "movie:603": "2533864553830568992",
};

// ─── Normalizer ───────────────────────────────────────────────────────────────

/**
 * Normalize a title for matching purposes.
 * - Lowercase
 * - Strip colons, hyphens, apostrophes, dots (punctuation only — articles kept)
 * - Collapse whitespace
 *
 * Symmetric: normalizing both sides before comparison means
 * "Spider-Man: No Way Home" and "Spider Man No Way Home" become identical.
 * Articles like "the", "a", "an" are intentionally kept —
 * "Avatar: The Last Airbender" ≠ "Avatar" and must not collapse to the same string.
 */
export function normalizeForMatch(title: string): string {
  return title
    .toLowerCase()
    .replace(/[:\-'".!?]/g, " ") // strip punctuation, keep letters/digits/spaces
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function loadMap(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMap(map: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch { /* storage full — noop */ }
}

function getCached(key: string): string | number | null {
  const map = loadMap();
  const entry = map[key];
  if (!entry) return null;
  // Check TTL — manual overrides never expire (ts === 0)
  if (entry.ts !== 0 && Date.now() - entry.ts > TTL_MS) {
    // Expired — delete and return null so a fresh search runs
    delete map[key];
    saveMap(map);
    return null;
  }
  return entry.subjectId;
}

function setCached(key: string, subjectId: string | number, permanent = false) {
  const map = loadMap();
  map[key] = { subjectId, ts: permanent ? 0 : Date.now() };
  saveMap(map);
}

/** Clear expired entries. Call occasionally to keep storage lean. */
export function pruneCache() {
  const map = loadMap();
  const now = Date.now();
  let changed = false;
  for (const key of Object.keys(map)) {
    const e = map[key];
    if (e.ts !== 0 && now - e.ts > TTL_MS) {
      delete map[key];
      changed = true;
    }
  }
  if (changed) saveMap(map);
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

/**
 * Find the Gifted subjectId for a TMDB title.
 *
 * Matching rules:
 *  - Titles are normalized symmetrically (punctuation stripped, lowercase)
 *  - Year comparison strips month/day from Gifted's full date — compares year only
 *  - For movies: title must match AND year must be within 1
 *  - For TV: title must match AND year must be within 2 (season dates vary)
 *  - Variant entries ([English], Dubbed, etc.) are deprioritized but not rejected
 *  - Returns null cleanly if no confident match — never returns a wrong guess
 */
export async function findGiftedMatch(opts: MapOptions): Promise<string | number | null> {
  const cacheKey = `${opts.type}:${opts.tmdbId}`;

  // 1. Manual override — permanent, highest priority
  if (MANUAL_OVERRIDES[cacheKey] != null) {
    setCached(cacheKey, MANUAL_OVERRIDES[cacheKey], true);
    return MANUAL_OVERRIDES[cacheKey];
  }

  // 2. Cache hit
  const cached = getCached(cacheKey);
  if (cached != null) return cached;

  // 3. Search Gifted and match
  const normTarget = normalizeForMatch(opts.title);
  const yearTolerance = opts.type === "tv" ? 2 : 1;
  const isVariantQuery = /\b(english|dubbed|dub|subbed|sub)\b/i.test(opts.title);

  let bestId: string | number | null = null;
  let bestScore = -Infinity;

  const score = (r: { title: string; year?: number | string; releaseDate?: string; type?: string }): number => {
    const normResult = normalizeForMatch(r.title);

    // Title must match — exact normalized match scores highest
    const titleMatch = normResult === normTarget;
    // Containment match — result title starts with our title (e.g. "Arcane S2" contains "Arcane")
    const containsMatch = normResult.startsWith(normTarget + " ") || normResult === normTarget;

    if (!titleMatch && !containsMatch) return -Infinity;

    let s = titleMatch ? 1.0 : 0.8; // exact > containment

    // Year comparison — strip month/day from Gifted's full date
    if (opts.year) {
      const ry = Number(
        r.year
          ? String(r.year).slice(0, 4)
          : r.releaseDate
            ? String(r.releaseDate).slice(0, 4)
            : "0"
      );
      if (ry) {
        const diff = Math.abs(ry - opts.year);
        if (diff > yearTolerance) return -Infinity; // hard reject — wrong year
        s += diff === 0 ? 0.3 : diff === 1 ? 0.15 : 0.05;
      }
      // No year on result — mild penalty, don't reject
      else s -= 0.1;
    }

    // Type bonus
    if (r.type) {
      s += r.type === opts.type ? 0.1 : -0.2;
    }

    // Deprioritize variant entries unless the query asked for them
    if (!isVariantQuery && /\b(english|dubbed|dub|subbed|sub|\[english\])\b/i.test(r.title)) {
      s -= 0.15;
    }

    return s;
  };

  const processResults = (results: Awaited<ReturnType<typeof searchGifted>>) => {
    for (const r of results) {
      if (!r?.subjectId) continue;
      const s = score(r);
      if (s > bestScore) {
        bestScore = s;
        bestId = r.subjectId;
      }
    }
  };

  // Page 1
  const page1 = await searchGifted(opts.title, 1);
  processResults(page1);

  // Page 2 only if no confident match from page 1
  // Threshold: title matched (≥ 0.8) + at least no year penalty
  if (bestScore < 0.85 && page1.length > 0) {
    const page2 = await searchGifted(opts.title, 2);
    processResults(page2);
  }

  // Minimum acceptance threshold — title must have matched (score ≥ 0.7)
  // anything below means either no title match or year was too far off
  if (bestScore < 0.7) {
    return null;
  }

  if (bestId != null) {
    setCached(cacheKey, bestId);
  }
  return bestId;
}

/**
 * Preload and cache a match in the background.
 * Fires and forgets — errors are swallowed so the UI is never affected.
 */
export async function preloadMatch(opts: MapOptions): Promise<void> {
  try {
    await findGiftedMatch(opts);
  } catch { /* noop — background preload, never surfaces errors */ }
}
