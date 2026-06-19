import { requireApiKey } from "@/lib/auth";
import { collectMediaInsights, fetchAccountInsights, fetchRecentMedia } from "@/lib/instagram";
import { parseLimit } from "@/lib/normalize";
import { cachedJsonResponse, handleRouteError } from "@/lib/responses";
import type { NormalizedInsight } from "@/types/instagram";

export const dynamic = "force-dynamic";

const NUMERIC_INSIGHT_NAMES = new Set([
  "views",
  "reach",
  "likes",
  "comments",
  "saved",
  "shares",
  "ig_reels_avg_watch_time",
  "ig_reels_video_view_total_time",
]);

function insightValue(insight: NormalizedInsight): number | null {
  if (!NUMERIC_INSIGHT_NAMES.has(insight.name)) {
    return null;
  }

  return typeof insight.value === "number" ? insight.value : null;
}

function sumInsight(
  items: Array<{ insights: NormalizedInsight[] }>,
  name: string,
): number {
  let total = 0;
  let foundAny = false;

  for (const item of items) {
    const insight = item.insights.find((entry) => entry.name === name);
    const value = insight ? insightValue(insight) : null;

    if (value !== null) {
      total += value;
      foundAny = true;
    }
  }

  return foundAny ? total : 0;
}

function averageInsight(
  items: Array<{ insights: NormalizedInsight[] }>,
  name: string,
): number | null {
  let total = 0;
  let count = 0;

  for (const item of items) {
    const insight = item.insights.find((entry) => entry.name === name);
    const value = insight ? insightValue(insight) : null;

    if (value !== null) {
      total += value;
      count += 1;
    }
  }

  return count > 0 ? Math.round(total / count) : null;
}

export async function GET(request: Request) {
  const authError = requireApiKey(request);

  if (authError) {
    return authError;
  }

  try {
    const { searchParams } = new URL(request.url);
    const requestedLimit = parseLimit(searchParams.get("limit"), 10, 1, 50);

    // Fetch more items than needed so we can still return a useful payload
    // after filtering down to Reels only.
    const candidateLimit = Math.min(50, Math.max(requestedLimit, requestedLimit * 3));
    const [candidates, accountInsights] = await Promise.all([
      fetchRecentMedia(candidateLimit),
      fetchAccountInsights(),
    ]);
    const reels = candidates
      .filter((media) => media.mediaProductType === "REELS")
      .slice(0, requestedLimit);

    const items = await Promise.all(
      reels.map(async (media) => {
        const insightResult = await collectMediaInsights(media.id);

        return {
          media,
          insights: insightResult.insights,
          insightErrors: insightResult.partialErrors,
        };
      }),
    );

    const summary = {
      reelCount: items.length,
      totalViews: sumInsight(items, "views"),
      totalReach: sumInsight(items, "reach"),
      totalLikes: sumInsight(items, "likes"),
      totalComments: sumInsight(items, "comments"),
      totalSaved: sumInsight(items, "saved"),
      totalShares: sumInsight(items, "shares"),
      totalFollows: accountInsights.follows,
      averageWatchTimeMs: averageInsight(items, "ig_reels_avg_watch_time"),
    };

    return cachedJsonResponse(
      {
        generatedAt: new Date().toISOString(),
        summary,
        items,
      },
      180, // 3-minute CDN TTL
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
