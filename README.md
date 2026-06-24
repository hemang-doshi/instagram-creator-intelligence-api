# Instagram Creator Intelligence API

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Instagram Graph API](https://img.shields.io/badge/Instagram%20Graph%20API-v25.0-E4405F?logo=instagram)](https://developers.facebook.com/docs/instagram-platform)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)](https://vercel.com)

Read-only Instagram creator analytics API built for **Custom GPT Actions**. Deploy it, point ChatGPT at the OpenAPI schema, and give your GPT real profile, media, and Reel performance data from the Instagram Graph API.

**Production URL:** [https://instagram-creator-intelligence-api.vercel.app](https://instagram-creator-intelligence-api.vercel.app)  
**OpenAPI schema:** [https://instagram-creator-intelligence-api.vercel.app/api/openapi.json](https://instagram-creator-intelligence-api.vercel.app/api/openapi.json)

## Why This Exists

Most GPTs that claim to help creators rely on screenshots, manual exports, or generic social-media heuristics. This service gives a Custom GPT a clean, authenticated, read-only API surface for real Instagram creator analytics.

- Six endpoints covering health, schema, profile, recent media, per-media insights, and a Reel-first report
- Strict TypeScript implementation with no SDK dependency layer
- Meta-aware rate limiting and warm-instance caching
- No database, no write operations, no publishing endpoints

## Who This Is For

- **Custom GPT builders** who want a production-ready Actions backend instead of a demo schema
- **Internal creator tooling teams** that need a thin read-only analytics service
- **Lightweight analytics backends** that prefer Next.js + Vercel over a larger data platform

## Quick Start

### Prerequisites

| Requirement | Version |
|---|---|
| **Node.js** | `>= 20.18.0` |
| **Instagram account** | Business or Creator |
| **Meta access token** | Long-lived |
| **Hosting** | Any Node-compatible platform, Vercel recommended |

### Required Meta Scopes

```text
instagram_basic
instagram_manage_insights
pages_show_list
pages_read_engagement
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `IG_GRAPH_BASE` | No | `https://graph.facebook.com/v25.0` | Graph API base URL |
| `IG_USER_ID` | Yes | — | Numeric Instagram account ID |
| `META_ACCESS_TOKEN` | Yes | — | Long-lived Meta access token |
| `CREATOR_API_KEY` | Yes | — | Shared secret used in the `x-api-key` header |
| `NEXT_PUBLIC_APP_NAME` | No | `Instagram Creator Intelligence API` | OpenAPI display name |

```bash
cp .env.example .env.local
npm install
npm run dev
```

Local server: `http://localhost:3000`

## API Surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Service health check |
| `GET` | `/api/openapi.json` | None | OpenAPI 3.1 schema for GPT Actions |
| `GET` | `/api/instagram/profile` | `x-api-key` | Profile plus day-period account insights |
| `GET` | `/api/instagram/recent-media?limit=N` | `x-api-key` | Recent media items, 1 to 50 |
| `GET` | `/api/instagram/media/{mediaId}/insights` | `x-api-key` | Per-media insight metrics |
| `GET` | `/api/instagram/reel-report?limit=N` | `x-api-key` | Reels with insights and a precomputed summary |

All authenticated endpoints require `x-api-key`.

### Quick Test

```bash
curl https://instagram-creator-intelligence-api.vercel.app/api/health
curl -H "x-api-key: YOUR_KEY" \
  https://instagram-creator-intelligence-api.vercel.app/api/instagram/profile
curl -H "x-api-key: YOUR_KEY" \
  "https://instagram-creator-intelligence-api.vercel.app/api/instagram/reel-report?limit=5"
```

## Deploy and Connect a GPT

### Deploy

**Vercel**

```bash
vercel
vercel env add IG_USER_ID
vercel env add META_ACCESS_TOKEN
vercel env add CREATOR_API_KEY
vercel --prod
```

**Any Node host**

```bash
npm run build
npm run start
```

### Connect to ChatGPT

1. Open your public schema URL: `https://your-domain/api/openapi.json`
2. In ChatGPT, create or edit a Custom GPT
3. Add a new Action and import the schema from URL
4. Configure API key auth with header name `x-api-key`
5. Use `getInstagramReelReport` as the first tool for content analysis

For a full setup walkthrough, prompt library, and recommended GPT instructions, see [GPT-INTEGRATION-GUIDE.md](./GPT-INTEGRATION-GUIDE.md).

## Local Development

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run the full test suite |
| `npm run test:watch` | Run tests in watch mode |

## Test Status

```bash
npm test
```

Current suite: `76` unit tests across auth, caching, environment loading, Meta API access, normalization, response shaping, rate limiting, and Instagram service logic.

## Architecture

```text
Route handlers
  -> auth check via x-api-key
  -> lib/instagram.ts orchestration
  -> lib/meta.ts Graph API client
  -> Meta usage header feedback into rate limiter
```

## Security Notes

- Meta access tokens are forwarded in the documented `access_token` request parameter format
- API keys are validated with `crypto.timingSafeEqual()`
- No secrets are committed; `.env*` and `.vercel` are ignored
- No token or API key logging
- Read-only service with no publish or mutate capability
- No database or long-term user-data storage

---

## Rate Limiting

The API includes a client-side token bucket (200 tokens/hour, synced to Meta's `X-Business-Use-Case-Usage` headers). When the budget is exhausted, `RateLimitError` returns a `429` with a `Retry-After` header.

Meta's own limits apply on top — see their [rate limiting docs](https://developers.facebook.com/docs/graph-api/overview/rate-limiting).

---

## Current Metrics

### Media-Level

| Metric | Notes |
|---|---|
| `views` | Replaces deprecated `plays`, `video_views` |
| `reach` | Unique accounts that saw the media |
| `likes`, `comments`, `saved`, `shares` | Standard engagement |
| `ig_reels_avg_watch_time` | Reels only |
| `ig_reels_video_view_total_time` | Reels only |
| `reels_skip_rate` | Reels only |

### Account-Level (from profile + reel-report)

| Metric | Source |
|---|---|
| `follows` | Day-period follows from Meta's `follows_and_unfollows` breakdown, or `null` if Meta omits the breakdown |
| `profileVisits` | Day-period profile views from Meta's `profile_views` metric |
| `profileActivity` | Day-period profile link/button taps from Meta's `profile_links_taps` metric |

### Not Requested (deprecated)

`impressions`, `plays`, `video_views`, `clips_replays_count`, `ig_reels_aggregated_all_plays_count`, `total_interactions`

---

## License

MIT
