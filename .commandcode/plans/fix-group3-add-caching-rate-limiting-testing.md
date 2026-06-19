# Fix Group 3 Metrics + Caching + Rate Limiting + Testing

## Summary

Fix the bug where account-level metrics are called on the media insights endpoint, add a caching layer, add client-side rate limiting, and add comprehensive test coverage — all with zero external dependencies.

## The Bug

In `lib/instagram.ts`, `INSIGHT_GROUPS` has 3 arrays — all called on `GET /{mediaId}/insights`:

- **Group 1**: `["views", "reach", "likes", "comments", "saved", "shares"]` — valid media-level metrics ✅
- **Group 2**: `["ig_reels_avg_watch_time", "ig_reels_video_view_total_time", "reels_skip_rate"]` — valid Reel metrics ✅
- **Group 3**: `["profile_activity", "profile_visits", "follows"]` — **account-level metrics** ❌

Group 3 metrics only work on `GET /{ig-user-id}/insights?metric=...&period=day`. Every call produces a permanent partial error, never returning real data.

---

## Files to Create

### 1. `lib/cache.ts` — In-memory TTL cache

```
TtlCache<T>
  ├── store: Map<string, { value: T; expiresAt: number }>
  │
  ├── get(key): T | undefined           // Returns undefined if expired/missing
  ├── set(key, value, ttlMs): void      // Store with TTL
  ├── has(key): boolean                 // Check existence (not expired)
  ├── delete(key): void                 // Remove single entry
  ├── clear(): void                     // Wipe entire cache
  └── evict(): void                     // Lazily purge expired entries

Singletons (exported):
  profileCache   — 5 min TTL  (300_000 ms)
  mediaCache     — 3 min TTL  (180_000 ms)
  insightsCache  — 3 min TTL  (180_000 ms)
```

- No external dependencies
- Per-serverless-instance (warm-start dedup, not cross-instance)
- Lazy eviction on get/set

### 2. `lib/rate-limiter.ts` — Token bucket rate limiter

```
RateLimitError extends Error
  ├── retryAfterSeconds: number

TokenBucket
  ├── tokens: number                         // Current token count
  ├── lastRefill: number                     // Timestamp of last refill
  ├── config: { maxTokens, refillIntervalMs, warningThreshold }
  │
  ├── consume(count = 1): Promise<void>
  │     - Refills tokens based on elapsed time
  │     - Above threshold: delays proportionally before allowing
  │     - Exhausted: throws RateLimitError
  │
  ├── updateFromUsageHeaders(headers: Headers): void
  │     - Parses X-Business-Use-Case-Usage header
  │     - Adjusts internal state to match Meta's observed usage
  │
  ├── remaining(): number                    // Tokens remaining
  └── usage(): number                        // 0.0 – 1.0+

Singleton:
  rateLimiter — maxTokens: 200, warningThreshold: 0.85
```

### 3. `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: { globals: true, environment: 'node' },
  resolve: { alias: { '@': path.resolve(__dirname) } },
});
```

### 4. Test files — `lib/__tests__/*.test.ts`

| Test File | What it covers |
|-----------|---------------|
| `cache.test.ts` | set/get, TTL expiry, eviction on access, overwrite, clear |
| `rate-limiter.test.ts` | consume/refill, threshold delay, exhaustion → error, header parsing |
| `meta.test.ts` | mock fetch, success path, MetaGraphError, retry-after parsing (int + date), Bearer token, rate limiter integration |
| `instagram.test.ts` | fetchRecentMedia, collectMediaInsights (Group 3 removed), fetchAccountInsights, partial error handling |
| `normalize.test.ts` | profile/media/insight normalization edge cases, parseLimit boundaries |
| `auth.test.ts` | valid/invalid/missing API key |
| `env.test.ts` | defaults, requireServerEnv throws, partial key checks |
| `responses.test.ts` | jsonResponse, errorResponse, handleRouteError per type, cachedJsonResponse headers, RateLimitError handling |

---

## Files to Modify

### 5. `lib/responses.ts` — Add cachedJsonResponse, handle RateLimitError

- Add `cachedJsonResponse(payload, ttlSeconds, swrSeconds?)` with `Cache-Control: public, s-maxage={ttl}, stale-while-revalidate={swr}`
- Update `handleRouteError` to catch `RateLimitError` → 429 with Retry-After

### 6. `lib/meta.ts` — Integrate rate limiter

```typescript
import { rateLimiter } from "@/lib/rate-limiter";

// Before fetch:
await rateLimiter.consume();

// After fetch:
rateLimiter.updateFromUsageHeaders(response.headers);
```

### 7. `lib/instagram.ts` — Fix Group 3, add fetchAccountInsights

- Remove Group 3 from `INSIGHT_GROUPS` (now 2 arrays)
- Add `fetchAccountInsights()`:
  - Calls `GET /{ig-user-id}/insights?metric=profile_activity,profile_visits,follows&period=day`
  - Returns `{ follows, profileVisits, profileActivity }` — all `number | null`
  - Uses `normalizeInsightMetric` internally

### 8. `app/api/instagram/profile/route.ts` — Add insights + caching

- Parallel `fetchAccountInsights()` via `Promise.all`
- Merge into response at top level (3 new fields)
- Use `cachedJsonResponse` with 300s TTL

New response adds: `follows`, `profileVisits`, `profileActivity`

### 9. `app/api/instagram/reel-report/route.ts` — Real follows + caching

- Parallel `fetchAccountInsights()` with `fetchRecentMedia()`
- `totalFollows` now uses real value instead of always-0
- Use `cachedJsonResponse` with 180s TTL

### 10. `app/api/instagram/recent-media/route.ts` — Add caching

- Use `cachedJsonResponse` with 180s TTL
- Content unchanged

### 11. `app/api/instagram/media/[mediaId]/insights/route.ts` — No caching

- Keep `force-dynamic` and `Cache-Control: no-store`
- Rate limiting still applies through `graphGet`

### 12. `package.json` — Test deps + scripts

```json
"devDependencies": { "vitest": "^3.1.0" },
"scripts": { "test": "vitest run", "test:watch": "vitest" }
```

### 13. `lib/openapi.ts` — Document new fields

- Add `follows`, `profileVisits`, `profileActivity` to profile schema
- Document `429` with `Retry-After` on all Instagram routes

---

## Order of Implementation

| Step | File(s) | What |
|------|---------|------|
| 1 | `package.json`, `vitest.config.ts` | Add test infra |
| 2 | `lib/cache.ts` | TtlCache class + singletons |
| 3 | `lib/__tests__/cache.test.ts` | Cache tests |
| 4 | `lib/rate-limiter.ts` | TokenBucket class + singleton |
| 5 | `lib/__tests__/rate-limiter.test.ts` | Rate limiter tests |
| 6 | `lib/responses.ts` | Add `cachedJsonResponse`, handle `RateLimitError` |
| 7 | `lib/__tests__/responses.test.ts` | Response tests |
| 8 | `lib/meta.ts` | Integrate rate limiter into `graphGet` |
| 9 | `lib/__tests__/meta.test.ts` | Meta tests |
| 10 | `lib/instagram.ts` | Fix Group 3 + add `fetchAccountInsights` |
| 11 | `lib/__tests__/instagram.test.ts` | Instagram tests |
| 12 | `lib/__tests__/env.test.ts`, `auth.test.ts`, `normalize.test.ts` | Remaining unit tests |
| 13 | `app/api/instagram/profile/route.ts` | Add insights + caching |
| 14 | `app/api/instagram/reel-report/route.ts` | Use real follows + caching |
| 15 | `app/api/instagram/recent-media/route.ts` | Add caching |
| 16 | `app/api/instagram/media/[mediaId]/insights/route.ts` | Verify no caching (keep no-store) |
| 17 | `lib/openapi.ts` | Document new response fields |
| 18 | Run `npm test` | Verify all tests pass |

---

## Verification

1. **Profile endpoint** returns new `follows`, `profileVisits`, `profileActivity` fields
2. **Reel-report `totalFollows`** now returns a real integer (new follows in day period) instead of always 0
3. **No regressions** in existing responses — all old fields retain their shape
4. **Cache headers** (`s-maxage`) appear on CDN-cached responses but not on dynamic media insights
5. **Rate limiter** doesn't block normal usage but throttles when approaching Meta's 200/hour ceiling
6. **All tests pass** — `npm test` exits 0
