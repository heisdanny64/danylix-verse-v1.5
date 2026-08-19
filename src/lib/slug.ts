import type { SubjectKind } from "@/services/moviebox";

/** Detail page href for a MovieBox subject. */
export function buildDetailsHref(_type: SubjectKind | string, subjectId: string | number): string {
  return `/info/${subjectId}`;
}

/** Player href for a MovieBox subject. Movies use se=0&ep=0. */
export function buildPlayerHref(
  type: SubjectKind | string,
  subjectId: string | number,
  se?: number,
  ep?: number,
): string {
  const kind = type === "tv" ? "tv" : type === "shorts" ? "shorts" : "movie";
  const season = kind === "movie" ? 0 : se ?? 1;
  const episode = kind === "movie" ? 0 : ep ?? 1;
  return `/player/${kind}/${subjectId}?se=${season}&ep=${episode}`;
}
