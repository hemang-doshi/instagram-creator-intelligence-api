# Instagram Creator Intelligence API

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Instagram Graph API](https://img.shields.io/badge/Instagram%20Graph%20API-v25.0-E4405F?logo=instagram)](https://developers.facebook.com/docs/instagram-platform)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel)](https://vercel.com)
[![CI](https://img.shields.io/badge/tests-75%20passing-brightgreen)](https://github.com/hemang-doshi/instagram-creator-intelligence-api)

A read-only API wrapper around the **Instagram Graph API v25.0**, designed as a **[Custom GPT Action](https://openai.com/index/introducing-gpt-actions/) backend**. Deploy to Vercel, connect your GPT, and give it real creator analytics — not generic advice.

---

## Features

- **Six endpoints** — health check, OpenAPI schema, profile, recent media, per-media insights, and a precomputed reel report
- **Fully typed** — TypeScript strict mode throughout
- **No SDKs** — pure `fetch()` against Meta's Graph API using the documented `access_token` request parameter
- **Partial error resilience** — incompatible insight metrics return partial errors instead of crashing the response
- **Client-side rate limiting** — token-bucket throttler synced to Meta's `X-Business-Use-Case-Usage` headers
- **In-memory TTL cache** — per-serverless-instance dedup for warm starts
- **CDN caching** — `Cache-Control: public, s-maxage` on profile, media, and reel endpoints
- **No database** — zero external dependencies beyond Next.js
- **75 unit tests** — covering all lib modules with mocked Meta API responses

---

## Prerequisites

| Requirement | Version |
|---|---|
| **Node.js** | >= 20.18.0 |
| **Instagram account** | Business or Creator (not personal) |
| **Meta access token** | Long-lived, with scopes below |
| **Vercel account** | (for deployment) |

### Required Meta Scopes

```
instagram_basic
instagram_manage_insights
pages_show_list
pages_read_engagement
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `IG_GRAPH_BASE` | No | `https://graph.facebook.com/v25.0` | Graph API base URL |
| `IG_USER_ID` | **Yes** | — | Numeric Instagram account ID |
| `META_ACCESS_TOKEN` | **Yes** | — | Long-lived Meta access token |
| `CREATOR_API_KEY` | **Yes** | — | Private key for `x-api-key` header auth |
| `NEXT_PUBLIC_APP_NAME` | No | `Instagram Creator Intelligence API` | Display name in OpenAPI schema |

Copy [`.env.example`](./.env.example) and fill in your values:

```bash
cp .env.example .env.local
```

---

## Local Development

```bash
npm install
npm run dev
```

The API is served at `http://localhost:3000`.

### Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run test suite (75 tests) |
| `npm run test:watch` | Run tests in watch mode |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Service health check |
| `GET` | `/api/openapi.json` | None | OpenAPI 3.1 schema for GPT Actions |
| `GET` | `/api/instagram/profile` | `x-api-key` | Profile + day-period account insights |
| `GET` | `/api/instagram/recent-media?limit=N` | `x-api-key` | Recent media items (1–50) |
| `GET` | `/api/instagram/media/{mediaId}/insights` | `x-api-key` | Per-media insight metrics |
| `GET` | `/api/instagram/reel-report?limit=N` | `x-api-key` | Reels with insights + precomputed summary |

All authenticated endpoints require the `x-api-key` header.

### Quick Test

```bash
curl http://localhost:3000/api/health
curl -H "x-api-key: YOUR_KEY" http://localhost:3000/api/instagram/profile
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/instagram/recent-media?limit=5"
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/instagram/reel-report?limit=5"
```

---

## Deployment

### Vercel (Recommended)

**Option A — Vercel CLI:**

```bash
vercel
vercel env add IG_USER_ID
vercel env add META_ACCESS_TOKEN
vercel env add CREATOR_API_KEY
vercel --prod
```

**Option B — Git integration:**

1. Push to GitHub
2. Import the repository in the [Vercel dashboard](https://vercel.com/new)
3. Add the same environment variables in the Vercel project settings
4. Deploy

### Other Hosting

This is a standard Next.js app. It deploys anywhere that supports Node.js ≥ 20.18. Set the same environment variables on your platform and run:

```bash
npm run build
npm run start
```

---

## Custom GPT Integration

1. **Deploy** the API to a public HTTPS URL
2. **Open** `https://your-domain.vercel.app/api/openapi.json` — confirm valid JSON
3. **In ChatGPT**, create or edit a Custom GPT → **Actions** → add new action
4. **Set authentication** to `API Key`, header `x-api-key`, value = your `CREATOR_API_KEY`
5. The GPT will discover all endpoints from the OpenAPI schema automatically

**Recommended first action:** `getInstagramReelReport` — it returns only Reels with a precomputed summary so the GPT doesn't have to sum metrics across items.

---

## Test Suite

```bash
npm test
```

```
✓ lib/__tests__/rate-limiter.test.ts  (7 tests)
✓ lib/__tests__/meta.test.ts           (6 tests)
✓ lib/__tests__/instagram.test.ts      (8 tests)
✓ lib/__tests__/env.test.ts            (8 tests)
✓ lib/__tests__/normalize.test.ts     (15 tests)
✓ lib/__tests__/cache.test.ts         (14 tests)
✓ lib/__tests__/responses.test.ts     (13 tests)
✓ lib/__tests__/auth.test.ts          (4 tests)
—————————————————————————————————————
  8 test files  |  75 passed  |  0 failed
```

### Mocks

- Meta API calls are mocked at the `fetch` level
- Environment variables are injected via `vi.mock("@/lib/env")`
- Rate limiter is mocked to avoid cross-test interference

---

## Architecture

```
┌─ Route Handlers ───────────────────────┐
│  app/api/instagram/                    │
│  ├── profile/route.ts                  │
│  ├── recent-media/route.ts             │
│  ├── media/[mediaId]/insights/route.ts │
│  └── reel-report/route.ts              │
└──────────┬─────────────────────────────┘
           │ auth check (x-api-key)
           ▼
┌─ lib/instagram.ts ─────────────────────┐
│  fetchRecentMedia()                    │
│  collectMediaInsights()                │
│  fetchAccountInsights()                │
└──────────┬─────────────────────────────┘
           │ Bearer token auth
           ▼
┌─ lib/meta.ts ──────────────────────────┐
│  graphGet<T>(path, params)             │
│  → rateLimiter.consume()               │
│  → fetch() with Bearer header          │
│  → rateLimiter.updateFromUsageHeaders()│
└────────────────────────────────────────┘
```

---

## Security Notes

- **Meta access token** is sent in the request format Meta documents for these endpoints: `access_token`
- **API key** is validated using `crypto.timingSafeEqual()` (constant-time comparison)
- **No secrets** are committed — `.env*` and `.vercel` are in `.gitignore`
- **No logging** of tokens or API keys
- **Read-only** — no publishing, posting, or mutation endpoints
- **No database** — no user data stored

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
