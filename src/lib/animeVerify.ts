import { verifyIsAnime } from "@/lib/anilist";
import type { TMDBMovie } from "@/lib/tmdb";
import { getDisplayInfo } from "@/lib/tmdb";

/** Synchronous best-effort filter: keeps items whose verification is already
 *  cached as true, OR not yet known (will be re-checked async). */
export async function filterVerifiedAnime(items: TMDBMovie[]): Promise<TMDBMovie[]> {
  const checks = await Promise.allSettled(
    items.map(async (i) => {
      const { title } = getDisplayInfo(i);
      const ok = await verifyIsAnime(title);
      return ok ? { ...i, _isAnime: true } as TMDBMovie : null;
    }),
  );
  const out: TMDBMovie[] = [];
  for (const r of checks) {
    if (r.status === "fulfilled" && r.value) out.push(r.value);
  }
  return out;
}