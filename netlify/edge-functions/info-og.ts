type EdgeContext = {
  next: () => Promise<Response>;
};

type MovieBoxInfo = {
  title?: string;
  description?: string | null;
  releaseDate?: string | null;
  poster?: string | null;
  thumbnail?: string | null;
  backdrop?: string | null;
  backdropPath?: string | null;
  background?: string | null;
};

const defaultApiUrl = "https://moviebox.byspun.xyz";

function getEnv(name: string): string | undefined {
  const deno = (globalThis as typeof globalThis & {
    Deno?: { env: { get: (key: string) => string | undefined } };
  }).Deno;
  return deno?.env.get(name);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function contentYear(releaseDate?: string | null): string | null {
  const year = releaseDate ? String(releaseDate).slice(0, 4) : "";
  return /^\d{4}$/.test(year) ? year : null;
}

function formatTitle(info: MovieBoxInfo): string {
  const title = info.title?.trim() || "D. Verse";
  const year = contentYear(info.releaseDate);
  return year ? `${title} (${year})` : title;
}

function absoluteAssetUrl(value: string | null | undefined, origin: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, origin).toString();
  } catch {
    return null;
  }
}

async function getMovieBoxInfo(subjectId: string): Promise<MovieBoxInfo | null> {
  const apiUrl = (getEnv("VITE_MOVIEBOX_API_URL") || getEnv("MOVIEBOX_API_URL") || defaultApiUrl).replace(/\/$/, "");
  const secret = getEnv("VITE_MOVIEBOX_SECRET") || getEnv("MOVIEBOX_SECRET");
  if (!secret) return null;

  try {
    const response = await fetch(`${apiUrl}/info/${encodeURIComponent(subjectId)}`, {
      headers: {
        Accept: "application/json",
        "X-Worker-Secret": secret,
        "User-Agent": "D-Verse-Netlify-Edge",
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as MovieBoxInfo;
  } catch {
    return null;
  }
}

function metadataMarkup({
  title,
  description,
  image,
  canonical,
}: {
  title: string;
  description: string;
  image: string | null;
  canonical: string;
}): string {
  const safeTitle = escapeHtml(`${title} - D. Verse`);
  const safeDescription = escapeHtml(description);
  const safeCanonical = escapeHtml(canonical);
  const safeImage = image ? escapeHtml(image) : "";

  return [
    `<title>${safeTitle}</title>`,
    `<meta name="description" content="${safeDescription}">`,
    `<link rel="canonical" href="${safeCanonical}">`,
    `<meta property="og:title" content="${safeTitle}">`,
    `<meta property="og:description" content="${safeDescription}">`,
    `<meta property="og:url" content="${safeCanonical}">`,
    ...(safeImage ? [`<meta property="og:image" content="${safeImage}">`, `<meta name="twitter:image" content="${safeImage}">`] : []),
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${safeTitle}">`,
    `<meta name="twitter:description" content="${safeDescription}">`,
  ].join("\n    ");
}

export default async function handler(request: Request, context: EdgeContext): Promise<Response> {
  const response = await context.next();
  if (request.method !== "GET") return response;

  const url = new URL(request.url);
  const subjectId = url.pathname.split("/").filter(Boolean).pop();
  if (!subjectId) return response;

  const info = await getMovieBoxInfo(subjectId);
  if (!info) return response;

  const title = formatTitle(info);
  const description = info.description?.trim() || `Watch ${title} on D. Verse.`;
  const image = absoluteAssetUrl(
    info.backdrop || info.backdropPath || info.background || info.poster || info.thumbnail,
    url.origin,
  );
  const canonical = `${url.origin}/info/${encodeURIComponent(subjectId)}`;
  const metadata = metadataMarkup({ title, description, image, canonical });
  const html = await response.text();
  const withMetadata = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta[^>]+name=["']description["'][^>]*>/i, "")
    .replace("</head>", `    ${metadata}\n  </head>`);

  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=UTF-8");
  return new Response(withMetadata, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
