// netlify/edge-functions/og.js
// Netlify Edge Function — injects dynamic OG meta tags for detail pages.
// Runs at the edge before the static SPA is served, so bots (WhatsApp,
// Telegram, Twitter, iMessage) get a rich preview card with the correct
// title, description, image, rating and year for each piece of content.

const TMDB_KEY = "eb81f29c8c34e05a51e64378606495c0";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w780";
const SITE_URL = "https://dverse.name.ng";
const SITE_NAME = "D. Verse";
const FALLBACK_IMAGE = `${SITE_URL}/og-default.png`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSlug(slug) {
  const idx = slug.lastIndexOf("-");
  if (idx < 0) return { id: slug };
  return { id: slug.slice(idx + 1) };
}

function isGiftedId(id) {
  return /^\d{12,}$/.test(String(id));
}

async function fetchTMDBMeta(id, mediaType) {
  try {
    const res = await fetch(`${TMDB_BASE}/${mediaType}/${id}?api_key=${TMDB_KEY}`);
    if (!res.ok) return null;
    const d = await res.json();
    return {
      title: d.title || d.name || SITE_NAME,
      description: (d.overview || "").slice(0, 300),
      image: d.backdrop_path
        ? `${TMDB_IMG}${d.backdrop_path}`
        : d.poster_path
          ? `${TMDB_IMG}${d.poster_path}`
          : FALLBACK_IMAGE,
      rating: d.vote_average ? Number(d.vote_average).toFixed(1) : null,
      year: (d.release_date || d.first_air_date || "").slice(0, 4) || null,
    };
  } catch {
    return null;
  }
}

async function fetchGiftedMeta(subjectId) {
  try {
    const res = await fetch(
      `https://movieapi.giftedtech.co.ke/api/v2/info/${subjectId}`,
      {
        headers: {
          Authorization: "Bearer gifted_movieapi_x7xo5y3hx30riafeqdyhc27q716vld",
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
          Origin: "https://movieapi.giftedtech.co.ke",
          Referer: "https://movieapi.giftedtech.co.ke/",
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const r = data?.results?.subject || data?.result || data?.data;
    if (!r) return null;
    return {
      title: r.title || SITE_NAME,
      description: (r.description || r.overview || "").slice(0, 300),
      image: r.stills?.url || r.cover?.url || r.thumbnail || FALLBACK_IMAGE,
      rating: r.imdbRatingValue ? Number(r.imdbRatingValue).toFixed(1) : null,
      year: r.releaseDate ? String(r.releaseDate).slice(0, 4) : null,
    };
  } catch {
    return null;
  }
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildOGTags({ title, description, image, rating, year, pageUrl, mediaType }) {
  const fullTitle = [title, year ? `(${year})` : null, rating ? `⭐ ${rating}` : null]
    .filter(Boolean).join(" · ");
  const typeLabel = mediaType === "tv" ? "Series" : mediaType === "anime" ? "Anime" : "Movie";
  const desc = description
    ? `${typeLabel} · ${description}`
    : `Watch ${title} on ${SITE_NAME}`;

  return `
    <meta property="og:title" content="${esc(fullTitle)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:width" content="1280" />
    <meta property="og:image:height" content="720" />
    <meta property="og:url" content="${esc(pageUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(SITE_NAME)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(fullTitle)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    <meta name="twitter:image" content="${esc(image)}" />`.trim();
}

// ─── Route parser ─────────────────────────────────────────────────────────────

const DETAIL_ROUTE = /^\/(movie|tv|anime)\/(.+)$/;
const LEGACY_ROUTE = /^\/details\/(movie|tv|anime)\/(.+)$/;

// ─── Netlify Edge Function handler ───────────────────────────────────────────

export default async function handler(request, context) {
  const url = new URL(request.url);
  const { pathname } = url;

  // Parse route
  let mediaType = null;
  let rawId = null;

  const slugMatch = pathname.match(DETAIL_ROUTE);
  const legacyMatch = pathname.match(LEGACY_ROUTE);

  if (slugMatch) {
    mediaType = slugMatch[1] === "anime" ? "tv" : slugMatch[1];
    rawId = parseSlug(slugMatch[2]).id;
  } else if (legacyMatch) {
    mediaType = legacyMatch[1] === "anime" ? "tv" : legacyMatch[1];
    rawId = legacyMatch[2];
  }

  // Not a detail route — fall through to static serving
  if (!mediaType || !rawId) {
    return context.next();
  }

  // Fetch content metadata
  const gifted = isGiftedId(rawId);
  const meta = gifted
    ? await fetchGiftedMeta(rawId)
    : await fetchTMDBMeta(rawId, mediaType);

  // Get the base index.html Netlify would normally serve
  const indexRes = await context.next();
  let html = await indexRes.text();

  // Build dynamic OG tags
  const pageUrl = `${SITE_URL}${pathname}`;
  const ogTags = buildOGTags(
    meta
      ? { ...meta, pageUrl, mediaType }
      : {
          title: SITE_NAME,
          description: "Stream movies, series and anime in one universe.",
          image: FALLBACK_IMAGE,
          rating: null,
          year: null,
          pageUrl,
          mediaType,
        }
  );

  // Strip static OG/Twitter tags then inject dynamic ones before </head>
  html = html
    .replace(/<meta property="og:title"[^>]*>/g, "")
    .replace(/<meta property="og:description"[^>]*>/g, "")
    .replace(/<meta property="og:image"[^>]*>/g, "")
    .replace(/<meta property="og:type"[^>]*>/g, "")
    .replace(/<meta property="og:url"[^>]*>/g, "")
    .replace(/<meta name="twitter:card"[^>]*>/g, "")
    .replace(/<meta name="twitter:title"[^>]*>/g, "")
    .replace(/<meta name="twitter:description"[^>]*>/g, "")
    .replace(/<meta name="twitter:image"[^>]*>/g, "")
    .replace("</head>", `${ogTags}\n  </head>`);

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Cache at CDN edge for 1 hour, serve stale for 24h while revalidating
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
