# D. Verse

D. Verse, short for **Danylix Verse**, is a simple, mobile-first movie and series discovery experience. It provides a cinematic interface for browsing Moviebox content, viewing title details, watching available streams, managing a local library, and sharing title links.

## Features

- Moviebox-powered home rows, hero content, and search.
- Details pages at `/info/:id` using Moviebox subject IDs.
- Movie and series playback with episode navigation.
- Local watchlist and continue-watching library.
- Dynamic page titles, Open Graph metadata, and content artwork for shared details links.
- Netlify-ready SPA routing, Edge Function metadata handling, and an XML sitemap.

## Requirements

You need Node.js, npm, and a self-hosted Moviebox API instance. D. Verse does not include the Moviebox API itself.

## Moviebox API setup

1. Visit the [spun-moviebox-api repository](https://github.com/heisdanny64/spun-moviebox-api).
2. Follow that repository's instructions to self-host the API.
3. Configure the API's secret value when setting up the service.
4. Copy the deployed API URL and the same secret value into D. Verse's environment file.

The API URL and secret must match between the self-hosted Moviebox API and D. Verse. Never commit a real `.env` file or secret values to Git.

## Environment variables

Copy the example file before starting development:

```bash
cp .env.example .env
```

Then configure the following values:

```env
# Used by the browser application
VITE_MOVIEBOX_API_URL=https://your-moviebox-api.example.com
VITE_MOVIEBOX_SECRET=your-secret

# Used by the Netlify Edge Function for server-rendered social metadata
MOVIEBOX_API_URL=https://your-moviebox-api.example.com
MOVIEBOX_SECRET=your-secret
```

The `VITE_` variables are included in the browser build because the client calls the Moviebox API directly. The non-prefixed variables are for Netlify's server-side Edge Function and should be configured in Netlify's environment settings.

## Local development

```bash
npm install
npm run dev
```

The application starts at the local Vite development URL. The root route displays the welcome screen and then redirects to `/home`.

## Production build

```bash
npm run build
npm test
```

## Netlify deployment

Use the following Netlify settings:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Functions directory | `netlify/edge-functions` |

Configure all required Moviebox environment variables in Netlify before deploying. The repository includes `netlify.toml`, SPA fallback redirects, the dynamic details metadata Edge Function, `robots.txt`, and `sitemap.xml`.

## License

D. Verse is open-source software released under the [MIT License](./LICENSE). Copyright © 2026 Danny Daniels.
