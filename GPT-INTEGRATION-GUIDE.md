# 🤖 Custom GPT Integration Guide

> Connect this API to ChatGPT for real Instagram creator intelligence — profile analytics, content performance, and reel-by-reel insights.

---

## Table of Contents

1. [What You Get](#-what-you-get)
2. [Prerequisites](#-prerequisites)
3. [Step 1 — Verify Your Deployment](#-step-1--verify-your-deployment)
4. [Step 2 — Get Your OpenAPI Schema URL](#-step-2--get-your-openapi-schema-url)
5. [Step 3 — Create the Custom GPT](#-step-3--create-the-custom-gpt)
6. [Step 4 — Configure Authentication](#-step-4--configure-authentication)
7. [Step 5 — Add the Action Schema](#-step-5--add-the-action-schema)
8. [Step 6 — Write GPT Instructions](#-step-6--write-gpt-instructions)
9. [Step 7 — Test the Integration](#-step-7--test-the-integration)
10. [Available Tools (Endpoints)](#-available-tools-endpoints)
11. [Example Prompts](#-example-prompts)
12. [Troubleshooting](#-troubleshooting)
13. [Security Checklist](#-security-checklist)

---

## 🎯 What You Get

After integration, your Custom GPT can:

- **Analyze your content mix** — what's working, what's not, by media type
- **Understand audience behavior** — reach, engagement, watch time, skip rates
- **Compare reel performance** — spot patterns across your best and worst performers
- **Get account-level context** — follower growth, profile visits, activity trends
- **Answer strategic questions** — best posting times, content formats, engagement drivers

All without you pasting screenshots or manual copy-paste. The GPT calls the API directly.

---

## 📋 Prerequisites

| Item | Status |
|---|---|
| API deployed to Vercel (or any HTTPS endpoint) | ✅ Done |
| `IG_USER_ID`, `META_ACCESS_TOKEN`, `CREATOR_API_KEY` set on production | ✅ Done |
| `npm test` passes (75 tests) | ✅ Done |
| `npm run build` passes | ✅ Done |
| Custom GPTs available (ChatGPT Plus, Pro, or Team plan) | 🔲 You |

---

## ✅ Step 1 — Verify Your Deployment

Confirm the API is live and healthy:

```bash
curl https://your-domain.vercel.app/api/health
```

**Expected response:**

```json
{ "ok": true, "service": "Instagram Creator Intelligence API" }
```

Then confirm authenticated endpoints work:

```bash
curl -H "x-api-key: YOUR_CREATOR_API_KEY" \
  https://your-domain.vercel.app/api/instagram/profile
```

You should see your Instagram profile data with `follows`, `profileVisits`, and `profileActivity` fields.

---

## 📄 Step 2 — Get Your OpenAPI Schema URL

Open this URL in your browser:

```
https://your-domain.vercel.app/api/openapi.json
```

You'll see a JSON document describing all 6 endpoints. This is what ChatGPT reads to understand what your API can do. Keep this URL handy — you'll paste it in Step 5.

> **Don't have a domain?** Your Vercel deployment URL works fine. It looks like `https://your-project.vercel.app`.

---

## 🧠 Step 3 — Create the Custom GPT

1. Open [ChatGPT](https://chat.openai.com)
2. Click your name **→ My GPTs → Create a GPT**
3. Or go directly to [https://chat.openai.com/gpts](https://chat.openai.com/gpts)

Give your GPT a name and description:

| Field | Example |
|---|---|
| **Name** | `Instagram Creator Intelligence` |
| **Description** | `Analyzes my Instagram content, reels, and audience growth using real API data.` |
| **Profile Picture** | Upload an icon or use DALL·E to generate one |

---

## 🔑 Step 4 — Configure Authentication

In the **Actions** section of the GPT editor:

1. **Authentication** → Select **API Key**
2. **Type** → Select **Custom Header**
3. **Header name** → Enter `x-api-key`
4. **Header value** → Paste your `CREATOR_API_KEY` value

The key is encrypted at rest by OpenAI and never exposed to end users. You can rotate it independently of your Meta token.

---

## ⚙️ Step 5 — Add the Action Schema

In the same **Actions** section:

1. Click **Create new action**
2. Under **Schema**, select **Import from URL**
3. Paste your OpenAPI URL:
   ```
   https://your-domain.vercel.app/api/openapi.json
   ```
4. Click **Import**

The editor will parse the schema and show all detected actions. You should see 6 operations:

| Operation ID | What it does |
|---|---|
| `getHealth` | Basic health check |
| `getInstagramProfile` | Account profile + day insights |
| `getRecentInstagramMedia` | Recent posts with engagement |
| `getInstagramMediaInsights` | Per-media deep metrics |
| `getInstagramReelReport` | Reel analysis with summary |
| `getOpenApi` | The schema itself |

5. **Privacy Policy URL** — If you're making this GPT public (GPT Store), add a privacy policy URL. For private use, this is optional.

---

## 📝 Step 6 — Write GPT Instructions

Paste this into the **Instructions** field of your GPT. This tells ChatGPT *how* to use the tools and what persona to adopt.

<details>
<summary><strong>📋 Click to expand — Recommended Instructions</strong></summary>

```
You are a creator intelligence analyst. Your job is to help the user understand
their Instagram performance using real API data — not generic social media advice.

## Data Sources
You have access to a read-only Instagram analytics API with these tools:

1. getInstagramReelReport(limit) — PRIMARY tool. Use this first for any
   analysis. Returns only Reels with per-media insights and a precomputed
   summary of total views, reach, likes, comments, saved, shares, follows,
   and average watch time.

2. getInstagramProfile() — Account metadata plus day-period account
   insights (new follows, profile visits, profile activity).

3. getRecentInstagramMedia(limit) — Recent posts across all types (Image,
   Video, Carousel, Reels) with basic engagement.

4. getInstagramMediaInsights(mediaId) — Deep per-media metrics including
   watch time, skip rate, and engagement breakdown.

## Analysis Workflow

1. START with getInstagramReelReport(limit=20) to get a broad picture.
2. DIG DEEPER with getInstagramMediaInsights() on specific reels when
   needed (e.g., best performer, worst performer).
3. CONTEXTUALIZE with getInstagramProfile() for account growth trends.

## What to Analyze

- Content performance: Which reels overperform or underperform
- Engagement quality: Likes vs saves vs shares — different signals
- Watch time patterns: Long watches vs skips
- Account growth: Follows + profile visits as leading indicators
- Content mix: How different media types compare
- Trends over time: Compare recent vs older content

## Brand Voice

- Clean, sharp, analytical
- Calm and confident — no hype, no panic
- Specific and data-driven — cite exact numbers
- Strategic — explain what the data means, not just what it is
- Honest about limitations — partial errors, missing metrics, small sample sizes

## Important Rules

- NEVER ask for the API key or Meta access token
- NEVER suggest posting, publishing, or modifying content via API
- NEVER fabricate metrics — if data is missing, say so
- ALWAYS call getInstagramReelReport first for content analysis
- ALWAYS indicate when you're looking at a small sample (limit < 10)
- PREFER the precomputed summary fields over summing individual items
```
</details>

---

## 🧪 Step 7 — Test the Integration

In the **Preview** panel of the GPT editor, try these test prompts:

| Test | Expected behavior |
|---|---|
| `"Analyze my recent reels"` | Calls `getInstagramReelReport`, returns summary + per-reel breakdown |
| `"How's my account doing?"` | Calls `getInstagramProfile`, shows follower growth + activity |
| `"What's my best performing reel and why?"` | Calls reel report + drills into specific media insights |
| `"Show me my last 5 posts"` | Calls `getRecentInstagramMedia` |

If any action fails:
- Check the error response in Preview
- Verify the API key is correct in the auth config
- Confirm the OpenAPI URL is accessible

---

## 🛠️ Available Tools (Endpoints)

| Tool | What the GPT sees | Best for |
|---|---|---|
| `getInstagramReelReport(limit)` | Reels with per-media insights + precomputed summary | **Primary analysis** — start here |
| `getInstagramProfile()` | Profile metadata + day account insights | Account health check |
| `getRecentInstagramMedia(limit)` | Recent posts (all types) with engagement | Content mix overview |
| `getInstagramMediaInsights(mediaId)` | Deep per-media metrics | Diving into specific posts |

### What Each Endpoint Returns

**Profile** — `getInstagramProfile()`
```json
{
  "id": "178414...",
  "username": "creator",
  "followersCount": 12400,
  "follows": 15,
  "profileVisits": 42,
  "profileActivity": 7
}
```

**Reel Report** — `getInstagramReelReport(limit=10)`
```json
{
  "generatedAt": "2026-06-19T...",
  "summary": {
    "reelCount": 8,
    "totalViews": 45200,
    "totalLikes": 1230,
    "averageWatchTimeMs": 18500
  },
  "items": [
    {
      "media": { "id": "...", "caption": "...", "permalink": "..." },
      "insights": [ { "name": "views", "value": 5200 }, ... ]
    }
  ]
}
```

**Recent Media** — `getRecentInstagramMedia(limit=12)`
```json
{
  "items": [
    { "id": "...", "mediaType": "REELS", "likeCount": 340, "commentsCount": 12 }
  ]
}
```

**Media Insights** — `getInstagramMediaInsights(mediaId)`
```json
{
  "mediaId": "180...",
  "insights": [ { "name": "views", "value": 5200 }, ... ],
  "partialErrors": []
}
```

---

## 💬 Example Prompts

Here are prompts your GPT will handle after integration:

**Content analysis:**
- *"What were my top 5 reels this week and what made them perform?"*
- *"Compare my reel engagement to my carousel posts."*
- *"Which of my reels has the highest skip rate? What's the common pattern?"*

**Growth analysis:**
- *"How many new followers did I get today?"*
- *"Is my profile visit count correlated with my recent post performance?"*
- *"Show me my account growth trend from my profile insights."*

**Strategic:**
- *"Based on my last 20 reels, what content themes drive the most saves?"*
- *"What's my average watch time across reels? Is it improving?"*
- *"Which reel had the best like-to-view ratio and what was different about it?"*

**Quick checks:**
- *"Give me a one-paragraph summary of my current Instagram performance."*
- *"How am I doing this week vs last week?"*
- *"Any reels I should take a closer look at?"*

---

## 🔧 Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| GPT says "No data returned" | API key wrong or deployment down | Check `x-api-key` in auth config, verify `/api/health` returns 200 |
| `401` errors in Preview | API key mismatch | Re-enter `CREATOR_API_KEY` in GPT auth settings |
| `500` errors | Meta token expired or env var missing | Verify `META_ACCESS_TOKEN` is valid and all env vars are set on Vercel |
| Missing metrics (null values) | Incompatible metric for media type | Normal — partial errors are expected. GPT should say "data unavailable" |
| `429` rate limit | Too many requests | Wait and retry. Add `Retry-After` delay. Reduce `limit` parameter |
| GPT calls wrong tool | Instructions not specific enough | Add clearer workflow guidance in Instructions (see Step 6) |
| OpenAPI schema won't import | URL not accessible | Make sure `/api/openapi.json` is not behind auth |

---

## 🔒 Security Checklist

- [ ] `x-api-key` is stored in GPT auth (encrypted by OpenAI), never in instructions
- [ ] `.env.local` is in `.gitignore` and not committed
- [ ] `CREATOR_API_KEY` is a strong random string (use `openssl rand -hex 32`)
- [ ] `META_ACCESS_TOKEN` never appears in GPT instructions or responses
- [ ] GPT instructions explicitly forbid asking for credentials
- [ ] API is read-only — no publish, post, or mutate endpoints
- [ ] `npm test` passes before each deployment
- [ ] Meta token is rotated periodically (every 60 days or on exposure)

---

## Summary

```
┌─────────────────────────────────────────────────────┐
│                   ChatGPT User                       │
│  "Analyze my reels"                                  │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              Custom GPT with Instructions            │
│  → getInstagramReelReport(limit=20)                  │
│  → getInstagramProfile()                             │
│  → getInstagramMediaInsights(bestId)                 │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS + x-api-key header
                     ▼
┌─────────────────────────────────────────────────────┐
│       Instagram Creator Intelligence API             │
│  (Vercel → Meta Graph API v25.0)                    │
│  → Bearer token auth → rate limited → cached        │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              ChatGPT Response                        │
│  "Here's your reel performance breakdown..."         │
└─────────────────────────────────────────────────────┘
```
