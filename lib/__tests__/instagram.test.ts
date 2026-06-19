import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchRecentMedia, collectMediaInsights, fetchAccountInsights } from "@/lib/instagram";
import { MetaGraphError } from "@/lib/meta";

vi.mock("@/lib/env", () => ({
  requireServerEnv: vi.fn(() => ({
    IG_GRAPH_BASE: "https://graph.facebook.com/v25.0",
    IG_USER_ID: "17841400000000000",
    META_ACCESS_TOKEN: "test-token",
    CREATOR_API_KEY: "test-key",
  })),
}));

// Mock meta.ts's rate limiter to avoid interference
vi.mock("@/lib/rate-limiter", () => ({
  rateLimiter: {
    consume: vi.fn(),
    updateFromUsageHeaders: vi.fn(),
  },
  TokenBucket: class {},
  RateLimitError: class extends Error {},
}));

function mockFetchResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name === "content-type" ? "application/json" : null),
      forEach: () => {},
    },
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

describe("fetchRecentMedia", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns normalized media items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          data: [
            {
              id: "123",
              caption: "A post",
              media_type: "IMAGE",
              media_product_type: "FEED",
              permalink: "https://instagram.com/p/123",
              timestamp: "2025-01-01T00:00:00+0000",
              like_count: 10,
              comments_count: 5,
              thumbnail_url: "https://example.com/thumb.jpg",
              media_url: "https://example.com/img.jpg",
            },
          ],
        }),
      ),
    );

    const items = await fetchRecentMedia(12);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "123",
      caption: "A post",
      mediaType: "IMAGE",
      likeCount: 10,
      commentsCount: 5,
    });
  });

  it("returns empty array when no data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFetchResponse({})));
    const items = await fetchRecentMedia(12);
    expect(items).toEqual([]);
  });
});

describe("collectMediaInsights", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("collects insights from all groups and returns no partial errors on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          data: [
            {
              name: "views",
              period: "lifetime",
              values: [{ value: 100 }],
              title: "Views",
              description: "Total views",
            },
            {
              name: "reach",
              period: "lifetime",
              values: [{ value: 50 }],
              title: "Reach",
              description: "Total reach",
            },
          ],
        }),
      ),
    );

    const result = await collectMediaInsights("media123");

    expect(result.mediaId).toBe("media123");
    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.partialErrors).toHaveLength(0);
  });

  it("returns partial errors when a group fails", async () => {
    // First call succeeds, second call fails
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockFetchResponse({
          data: [
            {
              name: "views",
              period: "lifetime",
              values: [{ value: 100 }],
              title: "Views",
              description: "Views",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        mockFetchResponse(
          { error: { message: "Unsupported metric for this media type" } },
          400,
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await collectMediaInsights("media123");

    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.partialErrors.length).toBeGreaterThan(0);
  });

  it("does NOT fetch account-level metrics (Group 3 removed)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockFetchResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await collectMediaInsights("media123");

    // Should only have 2 groups = 2 calls to graphGet
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("fetchAccountInsights", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns parsed account-level insights", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          data: [
            {
              name: "follows",
              period: "day",
              values: [{ value: 15, end_time: "2026-01-11T08:00:00+0000" }],
              title: "Follows",
              description: "Number of follows",
            },
            {
              name: "profile_visits",
              period: "day",
              values: [{ value: 42, end_time: "2026-01-11T08:00:00+0000" }],
              title: "Profile Visits",
              description: "Number of profile visits",
            },
            {
              name: "profile_activity",
              period: "day",
              values: [{ value: 7, end_time: "2026-01-11T08:00:00+0000" }],
              title: "Profile Activity",
              description: "Number of profile activities",
            },
          ],
        }),
      ),
    );

    const result = await fetchAccountInsights();

    expect(result.follows).toBe(15);
    expect(result.profileVisits).toBe(42);
    expect(result.profileActivity).toBe(7);
  });

  it("returns null for metrics not present in response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          data: [
            {
              name: "follows",
              period: "day",
              values: [{ value: 5 }],
              title: "Follows",
              description: "Follows",
            },
          ],
        }),
      ),
    );

    const result = await fetchAccountInsights();

    expect(result.follows).toBe(5);
    expect(result.profileVisits).toBeNull();
    expect(result.profileActivity).toBeNull();
  });

  it("calls the user insights endpoint with period=day", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockFetchResponse({ data: [] }));
    globalThis.fetch = fetchMock;

    await fetchAccountInsights();

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = fetchMock.mock.calls[0][0];
    expect(url.toString()).toContain("/17841400000000000/insights");
    expect(url.toString()).toContain("period=day");
    expect(url.toString()).toContain("metric=");
  });
});
