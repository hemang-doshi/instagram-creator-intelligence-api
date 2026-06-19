import type {
  InstagramMediaItem,
  InstagramProfile,
  NormalizedInsight,
} from "@/types/instagram";

export function parseLimit(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export function normalizeProfile(payload: Record<string, unknown>): InstagramProfile {
  // Meta has been gradually migrating `profile_picture_url` to
  // `profile_picture_uri` (which is a CDN-backed URI rather than a signed
  // URL). Accept both and prefer the modern field when present.
  const profilePictureUrl =
    asString(payload.profile_picture_uri) ??
    asString(payload.profile_picture_url);

  return {
    id: asString(payload.id),
    username: asString(payload.username),
    name: asString(payload.name),
    biography: asString(payload.biography),
    followersCount: asNumber(payload.followers_count),
    followsCount: asNumber(payload.follows_count),
    mediaCount: asNumber(payload.media_count),
    profilePictureUrl,
  };
}

export function normalizeMediaItem(payload: Record<string, unknown>): InstagramMediaItem {
  return {
    id: asString(payload.id) ?? "",
    caption: asString(payload.caption),
    mediaType: asString(payload.media_type),
    mediaProductType: asString(payload.media_product_type),
    permalink: asString(payload.permalink),
    timestamp: asString(payload.timestamp),
    likeCount: asNumber(payload.like_count),
    commentsCount: asNumber(payload.comments_count),
    thumbnailUrl: asString(payload.thumbnail_url),
    mediaUrl: asString(payload.media_url),
  };
}

export function normalizeInsightMetric(
  payload: Record<string, unknown>,
): NormalizedInsight {
  const totalValue = payload.total_value;
  const values = payload.values;

  let normalizedValue: unknown = null;

  if (isObject(totalValue) && "value" in totalValue) {
    normalizedValue = totalValue.value;
  } else if (Array.isArray(values) && values.length > 0) {
    const [firstValue] = values;

    if (isObject(firstValue) && "value" in firstValue) {
      normalizedValue = firstValue.value;
    }
  }

  return {
    name: asString(payload.name) ?? "unknown_metric",
    title: asString(payload.title),
    description: asString(payload.description),
    value: normalizedValue,
    raw: payload,
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
