# Gifted Movies API
## Version 2.0.0 Documentation

---

## 🚀 Overview

The Gifted Movies API provides access to movies, TV series, metadata, streaming sources, and download links.

- Method: GET
- Response Format: JSON
- Authentication: Bearer Token Required
- Base URL:
https://movieapi.giftedtech.co.ke/api/v2/

- Uptime: 99.9%
- Average Response Time: < 200ms

---

## 🔐 Authentication

All requests must include an API key in the request headers:

Authorization: Bearer YOUR_API_KEY

⚠️ Without this header, all requests will fail.

---

## 📌 Core Features

- Advanced search (movies & TV series)
- Detailed metadata (cast, ratings, descriptions, trailers)
- Trending & homepage content
- Download sources in multiple qualities (360p–1080p)
- Fast responses (<200ms)
- Secure authenticated access

---

## 🌐 Base URL

https://movieapi.giftedtech.co.ke/api/v2/

---

# 📡 API ENDPOINTS

---

## 🏠 Homepage Data

GET /homepage

Returns homepage content including featured movies, trending content, and recommendations.

Example:
GET https://movieapi.giftedtech.co.ke/api/v2/homepage
Authorization: Bearer YOUR_API_KEY

---

## 🔥 Trending Content

GET /trending

Returns trending movies and TV series.

Example:
GET https://movieapi.giftedtech.co.ke/api/v2/trending
Authorization: Bearer YOUR_API_KEY

---

## 🔎 Search Movies & TV Series

GET /search/{query}

Parameters:
- query (string): movie or TV title
- page (int, optional): page number

Example:
GET https://movieapi.giftedtech.co.ke/api/v2/search/Black%20Panther?page=1
Authorization: Bearer YOUR_API_KEY

---

## 🎬 Movie / TV Info

GET /info/{id}

Parameters:
- id (string): movie or TV ID

Example:
GET https://movieapi.giftedtech.co.ke/api/v2/info/5099284245269335848
Authorization: Bearer YOUR_API_KEY

---

## 💾 Streaming & Download Sources

GET /sources/{id}

Returns streaming and download links in multiple qualities.

---

### 🎞 Movie Example
GET https://movieapi.giftedtech.co.ke/api/v2/sources/5099284245269335848
Authorization: Bearer YOUR_API_KEY

---

### 📺 TV Series Example
GET https://movieapi.giftedtech.co.ke/api/v2/sources/9028867555875774472?season=1&episode=1
Authorization: Bearer YOUR_API_KEY

---

Parameters:
- id (string): movie or series ID
- season (string, optional): season number
- episode (string, optional): episode number

---

# 💡 Code Examples

---

## JavaScript
```

const API_KEY = "YOUR_API_KEY";
const BASE_URL = "https://movieapi.giftedtech.co.ke/api/v2";

async function searchMovies(query) {
  const res = await fetch(
    `${BASE_URL}/search/${encodeURIComponent(query)}?page=1`,
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`
      }
    }
  );
  return res.json();
}

async function getMovieInfo(id) {
  const res = await fetch(`${BASE_URL}/info/${id}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`
    }
  });
  return res.json();
}

async function getSources(id, season, episode) {
  let url = `${BASE_URL}/sources/${id}`;

  if (season) {
    url += `?season=${season}`;
    if (episode) url += `&episode=${episode}`;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`
    }
  });

  return res.json();
}
```
---

## Python
```

import requests

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://movieapi.giftedtech.co.ke/api/v2"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

def search_movies(query):
    url = f"{BASE_URL}/search/{query}?page=1"
    return requests.get(url, headers=HEADERS).json()

def get_movie_info(movie_id):
    url = f"{BASE_URL}/info/{movie_id}"
    return requests.get(url, headers=HEADERS).json()

def get_sources(movie_id, season=None, episode=None):
    url = f"{BASE_URL}/sources/{movie_id}"
    params = {}

    if season:
        params["season"] = season
    if episode:
        params["episode"] = episode

    return requests.get(url, headers=HEADERS, params=params).json()
```
---

# ⚡ Quick Start

1. Get API Key (WhatsApp support)
2. Call homepage:
GET /homepage
3. Call trending:
GET /trending
4. Search content:
GET /search/{query}
5. Get details:
GET /info/{id}
6. Get streams:
GET /sources/{id}

---

# 🧠 Notes

- Always include Authorization header
- Use /info before /sources when possible
- TV shows require season & episode for streaming
- Do not modify returned IDs

---

# 🎯 Gifted Movies API v2.0.0
Crafted by Gifted Tech