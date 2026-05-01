# Gifted Movies API Documentation (v2.0.0)

Base URL:
https://movieapi.giftedtech.co.ke/api/v2/

----------------------------------------
🔐 AUTHENTICATION
----------------------------------------

All requests require Bearer Token:

Authorization: Bearer YOUR_API_KEY_HERE

----------------------------------------
📌 OVERVIEW
----------------------------------------

The Gifted Movies API provides:

- Movie & TV search
- Metadata
- Streaming links
- Download links
- Subtitles

----------------------------------------
📡 ENDPOINTS
----------------------------------------

1. Homepage

GET /homepage

Returns:
- Featured content
- Trending
- Recommendations

----------------------------------------

2. Trending

GET /trending

Returns:
- Popular movies and series

----------------------------------------

3. Search

GET /search/{query}?page=1

Params:
- query: movie or series name
- page: optional

Returns:
- List of results
- Includes `subjectId` (IMPORTANT)

----------------------------------------

4. Movie Info

GET /info/{id}

Params:
- id: subjectId

Returns:
- Title
- Description
- Rating
- Cast

----------------------------------------

5. Sources (Streaming + Download)

GET /sources/{id}

TV/Anime:
GET /sources/{id}?season=1&episode=1

Returns:
{
  results: [
    {
      quality: "720p",
      download_url: "...",
      stream_url: "...",
      size: "123456789"
    }
  ],
  subtitles: [
    {
      lan: "en",
      lanName: "English",
      url: "..."
    }
  ]
}

----------------------------------------
🎬 STREAMING
----------------------------------------

Use:
- stream_url

Load into video player

----------------------------------------
⬇️ DOWNLOAD
----------------------------------------

Use:
- download_url

Trigger direct download

----------------------------------------
📏 SIZE FORMAT
----------------------------------------

API returns size in BYTES.

Conversion:
- MB = bytes / (1024 * 1024)
- GB = MB / 1024 (if MB > 1024)

----------------------------------------
🧠 MATCHING STRATEGY
----------------------------------------

To find correct content:

1. Search using title
2. Compare:
   - Title similarity
   - Release year
   - Rating (optional)

3. Select best match

----------------------------------------
🎌 ANIME NOTE
----------------------------------------

AniList separates seasons.
Gifted API may not.

Solution:
- Search base title only
- Ignore "Season 2", "II", etc

----------------------------------------
⚠️ IMPORTANT NOTES
----------------------------------------

- Stream URLs may expire
- Always fetch fresh sources
- Do NOT cache links long-term

----------------------------------------
🚀 PERFORMANCE
----------------------------------------

- Fetch sources only when needed
- Use lazy loading
- Handle failures gracefully

----------------------------------------
📁 SUGGESTED STRUCTURE
----------------------------------------

/services/giftedApi.ts
/components/Player.tsx
/components/DownloadModal.tsx

----------------------------------------
🎯 GOAL
----------------------------------------

Provide:
- Fast streaming
- Clean download UX
- Reliable playback
