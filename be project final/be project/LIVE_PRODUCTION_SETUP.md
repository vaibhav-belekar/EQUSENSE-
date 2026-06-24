# Live Production Setup

This project is configured for live market fetching with a persistent cache layer.
The cache does not replace live data. It reduces repeated external API calls and
allows the UI to return the last real fetched response if Yahoo Finance, Dhan, or
another provider is temporarily slow.

## Backend Environment

Set these on Render, Railway, or your backend host:

```env
DATABASE_PROVIDER=supabase
DATABASE_URL=your_supabase_pooler_url
DIRECT_DATABASE_URL=your_supabase_direct_url
DATABASE_SSL_MODE=require
ENABLE_PERSISTENT_CACHE=true
ALLOW_STALE_CACHE_ON_ERROR=true
PRELOAD_ECOSYSTEM_ON_STARTUP=false
```

Use `PRELOAD_ECOSYSTEM_ON_STARTUP=true` only when the backend machine has enough
CPU/RAM and you want the ML ecosystem created during server startup.

## Frontend Environment

Set this on Vercel:

```env
VITE_API_URL=https://your-backend-url.onrender.com
```

Leave `VITE_ENABLE_STARTUP_INIT` empty unless you intentionally want the frontend
to call `/api/initialize` after page load.

## Database Setup

After setting the database URL, run the schema once:

```txt
POST /api/database/setup
```

Then check:

```txt
GET /api/database/status
GET /api/health
```

## Live Cache Behavior

- Realtime price cache: short TTL.
- OHLC chart cache: medium TTL.
- Company info cache: longer TTL.
- Recommendations: short TTL because they depend on current trend and sentiment.

When a cache entry is expired, the backend still tries live fetching first. If the
live provider fails and stale fallback is enabled, the API returns the last real
cached response with `stale: true`.

