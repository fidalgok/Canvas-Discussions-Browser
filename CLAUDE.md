# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Canvas Discussion Browser is a Next.js application that allows educators to view and analyze Canvas LMS discussion posts by user across all course topics. The app includes markdown export functionality for downloading all discussions in a portable format.

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production version
- `npm start` - Start production server

## Architecture

### API Proxy Pattern
All Canvas API requests are routed through `/api/canvas-proxy.js` to avoid CORS issues and keep API tokens secure. The proxy accepts requests with `apiUrl`, `apiKey`, `endpoint`, `method`, and optional `body` parameters.

### Client-Side Canvas API (`js/canvasApi.js`)
- `fetchCanvasDiscussions()` - Fetches all discussion posts across all topics for a course
- `fetchCanvasUserPosts()` - Filters posts for a specific user, including replies to their posts
- Uses the proxy pattern for all API calls
- Handles deduplication of posts to prevent duplicates in the UI

### Data Flow
1. Credentials stored in browser localStorage (apiUrl, apiKey, courseId)
2. Home page fetches all discussions and groups by user
3. Individual user pages show all posts by that user chronologically
4. Markdown export processes all topics and creates threaded markdown file

### Security Features
- HTML content sanitized with DOMPurify before rendering
- API tokens never hardcoded or committed
- Credentials stored only in localStorage
- No third-party data transmission

### Key Components
- `pages/index.js` - Home page with user list and markdown export
- `pages/user/[user_name].js` - Individual user discussion view
- `pages/settings.js` - Credential configuration
- `js/canvasApi.js` - Canvas API integration layer

### Markdown Export
Uses Turndown.js library to convert HTML content to markdown. Creates threaded discussion format with nested replies, sorted by due date. Accessible via "Download All Discussions" button on home page.

## Troubleshooting Notes

### Canvas API Pagination
- **Issue**: Canvas API returns paginated results (default ~10-20 items per page)
- **Solution**: Always use `per_page=100&page=X` parameters and loop through all pages
- **Location**: `js/canvasApi.js` - both discussion entries and replies endpoints
- **Symptoms**: Missing posts, fewer users than expected, incomplete data

### Missing Posts Debugging
- Enhanced logging in `canvasApi.js` shows detailed fetch progress
- Console output includes: topics found, entries per page, total counts, user summaries
- Check for: duplicate warnings, missing user data, pagination gaps
- Verify user counts match between Canvas API output and homepage display

### User Grouping
- Users grouped by `display_name` or `user_name` (falls back to 'Unknown')
- Same person with different names across posts = separate users (by design)
- Posts with missing user data logged in console for investigation

## Performance Optimizations

### Browser Caching System
- **Cache Duration**: Manual refresh only (no automatic expiry)
- **Storage**: Browser localStorage with persistent cache until manually cleared
- **Cache Key**: `canvas_discussions_${courseId}` 
- **Benefits**: Near-instant navigation after initial page load, cache persists during long grading sessions

### Cache Management
- **Manual-only refresh**: Cache persists indefinitely until user clicks "🔄 Refresh"
- **Settings changes**: Cache cleared when API credentials are updated
- **Manual refresh**: "🔄 Refresh" button on homepage for immediate cache clearing
- **Visual indicators**: 
  - "⚡ Last refreshed: [timestamp]" (green) = Shows when data was cached with exact timestamp
  - "🔄 Fresh data" (blue) = Just fetched from Canvas API (briefly shown during refresh)

### Implementation Details
- Cache check happens in `fetchCanvasDiscussions()` before API calls
- Console logging shows cache hits vs fresh fetches
- Cache stored as `{data: posts, timestamp: Date.now()}`
- `getCacheTimestamp()` function retrieves cache timestamp for display
- Homepage shows exact refresh time so users can decide when to refresh manually