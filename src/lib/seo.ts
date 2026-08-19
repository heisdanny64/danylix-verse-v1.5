export function contentYear(releaseDate?: string | null): string | null {
  const year = releaseDate ? String(releaseDate).slice(0, 4) : "";
  return /^\d{4}$/.test(year) ? year : null;
}

export function formatContentTitle(title: string, releaseDate?: string | null): string {
  const year = contentYear(releaseDate);
  return year ? `${title} (${year})` : title;
}

export function absoluteUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return null;
  }
}

function setMetaContent(selector: string, content: string | null) {
  const element = document.querySelector<HTMLMetaElement>(selector);
  if (element && content) element.setAttribute("content", content);
}

export function setDetailsMetadata({
  title,
  description,
  image,
}: {
  title: string;
  description?: string | null;
  image?: string | null;
}) {
  document.title = `${title} - D. Verse`;
  setMetaContent('meta[name="description"]', description || `Watch ${title} on D. Verse.`);
  setMetaContent('meta[property="og:title"]', `${title} - D. Verse`);
  setMetaContent('meta[property="og:description"]', description || `Watch ${title} on D. Verse.`);
  setMetaContent('meta[property="og:image"]', image || null);
  setMetaContent('meta[name="twitter:title"]', `${title} - D. Verse`);
  setMetaContent('meta[name="twitter:description"]', description || `Watch ${title} on D. Verse.`);
  setMetaContent('meta[name="twitter:image"]', image || null);
}

export function setPlayerMetadata(title: string) {
  document.title = `Watch ${title} on D. Verse`;
}
