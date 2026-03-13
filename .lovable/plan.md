

# D.Verse — Dark Cinematic Movie Discovery App

## Overview
A mobile-first movie discovery prototype with a deep black/violet cinematic theme, featuring poster-focused browsing, recommendations, and a personal library.

## Design System
- **Background**: #0B0B0F, **Cards**: #15151D, **Primary**: #7B5CFF, **Secondary**: #A78BFA
- **Text**: #F5F5F7 (primary), #A1A1AA (secondary)
- Rounded corners, subtle purple hover glows, clean spacing

## Pages & Features

### 1. Home Page
- D.Verse logo/branding at top
- Search bar ("Search movies or series…") — tapping navigates to a dedicated Search page
- Horizontal scrolling poster rows: Trending Movies, Trending Series, Popular Anime, Action Movies
- Each row shows ~6-8 movie poster cards with title overlay
- Clicking a poster opens Movie Details

### 2. Search Page (not a nav tab)
- Full-screen search with input field and filtered results grid
- Accessible only via the Home page search bar

### 3. Movie Details Page
- Large backdrop/poster, title, year, rating, genre tags, synopsis placeholder
- "Add to Library" button with violet accent

### 4. Recommendations Page
- Grid of recommended movie poster cards (placeholder data)
- Clean layout with section heading

### 5. Library Page
- Two sections: "Watchlist" and "Continue Watching" (placeholder cards)
- Empty states with messaging

### 6. Bottom Navigation Bar
- Fixed bottom bar with 3 tabs: Home, Recommendations, Library
- Active tab highlighted with #7B5CFF accent
- Icons + labels

## Movie Card Component
- Rounded corners, poster image, title overlay at bottom
- Hover/tap: subtle purple glow border effect

## Data
- All movie data will be hardcoded mock data with placeholder poster images
- ~20 sample movies across categories

