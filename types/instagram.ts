export type InstagramProfile = {
  id: string | null;
  username: string | null;
  name: string | null;
  biography: string | null;
  followersCount: number | null;
  followsCount: number | null;
  mediaCount: number | null;
  profilePictureUrl: string | null;
};

export type InstagramMediaItem = {
  id: string;
  caption: string | null;
  mediaType: string | null;
  mediaProductType: string | null;
  permalink: string | null;
  timestamp: string | null;
  likeCount: number | null;
  commentsCount: number | null;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
};

export type NormalizedInsight = {
  name: string;
  title: string | null;
  description: string | null;
  value: unknown;
  raw: Record<string, unknown>;
};

export type PartialInsightError = {
  metricGroup: string[];
  status: number;
  message: string;
  details: unknown;
};
