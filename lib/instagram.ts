import { requireServerEnv } from "@/lib/env";
import { graphGet, MetaGraphError } from "@/lib/meta";
import { normalizeInsightMetric, normalizeMediaItem } from "@/lib/normalize";
import type { InstagramMediaItem, NormalizedInsight, PartialInsightError } from "@/types/instagram";

const MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_product_type",
  "permalink",
  "timestamp",
  "like_count",
  "comments_count",
  "thumbnail_url",
  "media_url",
].join(",");

// Insight metric groups, kept as separate requests so a metric that is
// incompatible with a media product type returns a partial error instead
// of failing the whole response.
//
// Notes (Instagram Graph API v22+):
// - `total_interactions` was deprecated and removed; we sum the
//   components (likes + comments + saved + shares) when needed downstream.
// - `views` is the modern Reels/feed/stories play metric (replaces
//   `plays`, `ig_reels_aggregated_all_plays_count`, `clips_replays_count`,
//   and the legacy `video_views`).
// - `impressions` is deprecated for media created on or after July 2, 2024.
// - Account-level metrics (profile_activity, profile_visits, follows) are
//   fetched via fetchAccountInsights() instead — they require the
//   /{ig-user-id}/insights endpoint with period=day.
const INSIGHT_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  ["views", "reach", "likes", "comments", "saved", "shares"],
  ["ig_reels_avg_watch_time", "ig_reels_video_view_total_time", "reels_skip_rate"],
];

type MediaListPayload = {
  data?: Array<Record<string, unknown>>;
};

type InsightsPayload = {
  data?: Array<Record<string, unknown>>;
};

export async function fetchRecentMedia(limit: number): Promise<InstagramMediaItem[]> {
  const env = requireServerEnv();
  const payload = await graphGet<MediaListPayload>(`${env.IG_USER_ID}/media`, {
    fields: MEDIA_FIELDS,
    limit,
  });

  return (payload.data || []).map(normalizeMediaItem);
}

export async function collectMediaInsights(mediaId: string): Promise<{
  mediaId: string;
  insights: NormalizedInsight[];
  partialErrors: PartialInsightError[];
}> {
  const results = await Promise.all(
    INSIGHT_GROUPS.map(async (metricGroup) => {
      try {
        const payload = await graphGet<InsightsPayload>(`${mediaId}/insights`, {
          metric: metricGroup.join(","),
        });

        return {
          insights: (payload.data || []).map(normalizeInsightMetric),
          partialError: null,
        };
      } catch (error) {
        if (error instanceof MetaGraphError) {
          return {
            insights: [],
            partialError: {
              metricGroup,
              status: error.status,
              message: error.message,
              details: error.details,
            },
          };
        }

        throw error;
      }
    }),
  );

  return {
    mediaId,
    insights: results.flatMap((result) => result.insights),
    partialErrors: results
      .map((result) => result.partialError)
      .filter((error): error is PartialInsightError => error !== null),
  };
}

/**
 * Fetch account-level insights for the configured Instagram user.
 *
 * Calls GET /{ig-user-id}/insights with metric=profile_activity,profile_visits,follows
 * and period=day. These metrics are not available on the per-media insights endpoint.
 */
export async function fetchAccountInsights(): Promise<{
  follows: number | null;
  profileVisits: number | null;
  profileActivity: number | null;
}> {
  const env = requireServerEnv();
  const payload = await graphGet<InsightsPayload>(`${env.IG_USER_ID}/insights`, {
    metric: ["profile_activity", "profile_visits", "follows"].join(","),
    period: "day",
  });

  const extract = (name: string): number | null => {
    const entry = (payload.data || []).find((d) => d.name === name);
    if (!entry) return null;
    const normalized = normalizeInsightMetric(entry);
    return typeof normalized.value === "number" ? normalized.value : null;
  };

  return {
    follows: extract("follows"),
    profileVisits: extract("profile_visits"),
    profileActivity: extract("profile_activity"),
  };
}
