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
// - Account-level metrics are fetched via fetchAccountInsights() instead —
//   they require the /{ig-user-id}/insights endpoint.
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
 * Meta's current IG user insights API no longer accepts the legacy
 * `profile_activity`, `profile_visits`, and `follows` metric names.
 *
 * We now use:
 * - `profile_views` as the replacement for profile visits
 * - `profile_links_taps` as the closest profile-action metric
 * - `follows_and_unfollows` with `breakdown=follow_type` for follows, when
 *   Meta returns breakdown values for the account
 */
export async function fetchAccountInsights(): Promise<{
  follows: number | null;
  profileVisits: number | null;
  profileActivity: number | null;
}> {
  const env = requireServerEnv();
  const [profilePayload, followsPayload] = await Promise.all([
    graphGet<InsightsPayload>(`${env.IG_USER_ID}/insights`, {
      metric: ["profile_views", "profile_links_taps"].join(","),
      period: "day",
      metric_type: "total_value",
    }),
    graphGet<InsightsPayload>(`${env.IG_USER_ID}/insights`, {
      metric: "follows_and_unfollows",
      period: "day",
      metric_type: "total_value",
      breakdown: "follow_type",
    }),
  ]);

  const extractMetricValue = (
    payload: InsightsPayload,
    name: string,
  ): number | null => {
    const entry = (payload.data || []).find((d) => d.name === name);
    if (!entry) return null;
    const normalized = normalizeInsightMetric(entry);
    return typeof normalized.value === "number" ? normalized.value : null;
  };

  const extractFollows = (payload: InsightsPayload): number | null => {
    const entry = (payload.data || []).find((d) => d.name === "follows_and_unfollows");
    if (!entry || typeof entry !== "object" || entry === null) {
      return null;
    }

    const totalValue = entry.total_value;
    if (!totalValue || typeof totalValue !== "object") {
      return null;
    }

    const breakdowns = (totalValue as { breakdowns?: unknown }).breakdowns;
    if (!Array.isArray(breakdowns)) {
      return null;
    }

    for (const breakdown of breakdowns) {
      if (!breakdown || typeof breakdown !== "object") {
        continue;
      }

      const results = (breakdown as { results?: unknown }).results;
      if (!Array.isArray(results)) {
        continue;
      }

      for (const result of results) {
        if (!result || typeof result !== "object") {
          continue;
        }

        const dimensionValues = (result as { dimension_values?: unknown }).dimension_values;
        const value = (result as { value?: unknown }).value;
        const followType = Array.isArray(dimensionValues) ? dimensionValues[0] : null;

        if (
          (followType === "follows" || followType === "followed") &&
          typeof value === "number"
        ) {
          return value;
        }
      }
    }

    return null;
  };

  return {
    follows: extractFollows(followsPayload),
    profileVisits: extractMetricValue(profilePayload, "profile_views"),
    profileActivity: extractMetricValue(profilePayload, "profile_links_taps"),
  };
}
