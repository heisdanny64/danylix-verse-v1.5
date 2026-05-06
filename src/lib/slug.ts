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

/** Gifted ids are non-numeric strings; TMDB ids are numeric. */
export function isGiftedId(id: string | number | undefined | null): boolean {
  if (id == null) return false;
  const s = String(id);
  return !/^\d+$/.test(s);
}

export function buildDetailsHref(type: "movie" | "tv" | "anime", id: string | number, title: string): string {
  const t = type === "anime" ? "tv" : type;
  return `/${t}/${toSlug(title)}-${id}`;
}