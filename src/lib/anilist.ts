// AniList is intentionally reduced to a single boolean verification helper.
// All metadata, season-merging, and ID-mapping logic has been removed.

const ANILIST_URL = "https://graphql.anilist.co";
const CACHE_KEY = "dverse_anime_verify_cache_v1";

type Cache = Record<string, boolean>;

function loadCache(): Cache {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    return {};
  }
}
function saveCache(c: Cache) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* noop */
  }
}

const memCache: Cache = loadCache();
const inflight: Record<string, Promise<boolean>> = {};

function key(title: string): string {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Verify that a title exists on AniList as anime. Returns boolean only.
 * Cached in-memory + sessionStorage. Never throws.
 */
export async function verifyIsAnime(title: string): Promise<boolean> {
  const k = key(title);
  if (!k) return false;
  if (k in memCache) return memCache[k];
  if (k in inflight) return inflight[k];

  const p = (async () => {
    try {
      const res = await fetch(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          query: `query($s:String){Page(page:1,perPage:1){media(type:ANIME,search:$s,isAdult:false){id}}}`,
          variables: { s: title },
        }),
      });
      const json = await res.json();
      const ok = !!json?.data?.Page?.media?.length;
      memCache[k] = ok;
      saveCache(memCache);
      return ok;
    } catch {
      return false;
    } finally {
      delete inflight[k];
    }
  })();
  inflight[k] = p;
  return p;
}
