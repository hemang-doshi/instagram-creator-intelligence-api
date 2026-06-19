import { describe, it, expect } from "vitest";
import {
  normalizeProfile,
  normalizeMediaItem,
  normalizeInsightMetric,
  parseLimit,
} from "@/lib/normalize";

describe("normalizeProfile", () => {
  it("normalizes a full profile payload", () => {
    const profile = normalizeProfile({
      id: "123",
      username: "testuser",
      name: "Test User",
      biography: "A bio",
      followers_count: 100,
      follows_count: 50,
      media_count: 20,
      profile_picture_url: "https://example.com/pic.jpg",
    });

    expect(profile).toEqual({
      id: "123",
      username: "testuser",
      name: "Test User",
      biography: "A bio",
      followersCount: 100,
      followsCount: 50,
      mediaCount: 20,
      profilePictureUrl: "https://example.com/pic.jpg",
    });
  });

  it("prefers profile_picture_uri over profile_picture_url", () => {
    const profile = normalizeProfile({
      id: "123",
      username: "test",
      name: "Test",
      biography: "",
      followers_count: 0,
      follows_count: 0,
      media_count: 0,
      profile_picture_uri: "https://cdn.example.com/pic.jpg",
      profile_picture_url: "https://example.com/pic.jpg",
    });

    expect(profile.profilePictureUrl).toBe("https://cdn.example.com/pic.jpg");
  });

  it("handles null/missing fields gracefully", () => {
    const profile = normalizeProfile({});
    expect(profile.id).toBeNull();
    expect(profile.username).toBeNull();
    expect(profile.name).toBeNull();
    expect(profile.followersCount).toBeNull();
    expect(profile.followsCount).toBeNull();
    expect(profile.mediaCount).toBeNull();
    expect(profile.profilePictureUrl).toBeNull();
  });
});

describe("normalizeMediaItem", () => {
  it("normalizes a media item with all fields", () => {
    const item = normalizeMediaItem({
      id: "media123",
      caption: "Cool photo",
      media_type: "IMAGE",
      media_product_type: "FEED",
      permalink: "https://instagram.com/p/media123",
      timestamp: "2025-06-01T12:00:00+0000",
      like_count: 42,
      comments_count: 7,
      thumbnail_url: "https://example.com/thumb.jpg",
      media_url: "https://example.com/img.jpg",
    });

    expect(item).toEqual({
      id: "media123",
      caption: "Cool photo",
      mediaType: "IMAGE",
      mediaProductType: "FEED",
      permalink: "https://instagram.com/p/media123",
      timestamp: "2025-06-01T12:00:00+0000",
      likeCount: 42,
      commentsCount: 7,
      thumbnailUrl: "https://example.com/thumb.jpg",
      mediaUrl: "https://example.com/img.jpg",
    });
  });

  it("defaults id to empty string when missing", () => {
    const item = normalizeMediaItem({});
    expect(item.id).toBe("");
  });
});

describe("normalizeInsightMetric", () => {
  it("extracts value from total_value", () => {
    const normalized = normalizeInsightMetric({
      name: "views",
      title: "Views",
      description: "Total views",
      total_value: { value: 100 },
    });

    expect(normalized.name).toBe("views");
    expect(normalized.value).toBe(100);
  });

  it("extracts value from values array", () => {
    const normalized = normalizeInsightMetric({
      name: "reach",
      title: "Reach",
      description: "Total reach",
      values: [{ value: 50 }],
    });

    expect(normalized.value).toBe(50);
  });

  it("handles missing data gracefully", () => {
    const normalized = normalizeInsightMetric({});
    expect(normalized.name).toBe("unknown_metric");
    expect(normalized.value).toBeNull();
  });

  it("preserves raw payload", () => {
    const payload = { name: "saved", total_value: { value: 20 } };
    const normalized = normalizeInsightMetric(payload);
    expect(normalized.raw).toEqual(payload);
  });
});

describe("parseLimit", () => {
  it("returns the parsed value within bounds", () => {
    expect(parseLimit("25", 12, 1, 50)).toBe(25);
  });

  it("clamps to max", () => {
    expect(parseLimit("100", 12, 1, 50)).toBe(50);
  });

  it("clamps to min", () => {
    expect(parseLimit("0", 12, 1, 50)).toBe(1);
  });

  it("returns fallback for null", () => {
    expect(parseLimit(null, 12, 1, 50)).toBe(12);
  });

  it("returns fallback for NaN", () => {
    expect(parseLimit("abc", 12, 1, 50)).toBe(12);
  });

  it("floors the parsed value", () => {
    expect(parseLimit("10.7", 12, 1, 50)).toBe(10);
  });
});
