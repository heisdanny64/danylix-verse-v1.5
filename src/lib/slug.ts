export function toSlug(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "title";
}

/** Parse "the-matrix-603" -> { slug: "the-matrix", id: "603" } */
export function parseSlug(slug: string): { slug: string; id: string } {
  const idx = slug.lastIndexOf("-");
  if (idx < 0) return { slug: "", id: slug };
  return { slug: slug.slice(0, idx), id: slug.slice(idx + 1) };
}

/** Gifted ids are large int64 strings (16-19 digits). TMDB ids are ≤ 8 digits.
 *  We distinguish them by digit count rather than by non-numeric characters,
 *  because both are pure digit strings. */
export function isGiftedId(id: string | number | undefined | null): boolean {
  if (id == null) return false;
  const s = String(id).trim();
  // Pure digits AND long enough to be a Gifted int64 subjectId
  return /^\d+$/.test(s) && s.length >= 12;
}

export function buildDetailsHref(type: "movie" | "tv" | "anime", id: string | number, title: string): string {
  const t = type === "anime" ? "tv" : type;
  return `/${t}/${toSlug(title)}-${id}`;
}
