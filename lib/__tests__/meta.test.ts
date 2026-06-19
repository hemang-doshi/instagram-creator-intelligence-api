import { describe, it, expect, vi, afterEach } from "vitest";
import { graphGet, MetaGraphError } from "@/lib/meta";

// Mock env module
vi.mock("@/lib/env", () => ({
  requireServerEnv: vi.fn(() => ({
    IG_GRAPH_BASE: "https://graph.facebook.com/v25.0",
    IG_USER_ID: "17841400000000000",
    META_ACCESS_TOKEN: "test-token",
    CREATOR_API_KEY: "test-key",
  })),
}));

// Mock rate limiter to avoid cross-test interference
vi.mock("@/lib/rate-limiter", () => ({
  rateLimiter: {
    consume: vi.fn(),
    updateFromUsageHeaders: vi.fn(),
  },
  TokenBucket: class {},
  RateLimitError: class extends Error {},
}));

function mockFetch(status: number, body: unknown, headers?: Record<string, string>) {
  const headerEntries = headers ?? {};
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => headerEntries[name] ?? null,
      forEach: (cb: (v: string, k: string) => void) => {
        Object.entries(headerEntries).forEach(([k, v]) => cb(v, k));
      },
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  });
}

describe("graphGet", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns parsed data on success", async () => {
    const data = { data: [{ id: "123", name: "Test" }] };
    const fetchMock = mockFetch(200, data, {
      "content-type": "application/json",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await graphGet<{ data: Array<{ id: string; name: string }> }>(
      "me/media",
      { fields: "id,name" },
    );

    expect(result).toEqual(data);

    // Verify the token is sent using the documented query parameter form.
    const callUrl = fetchMock.mock.calls[0][0] as URL;
    const callInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(callInit.headers).toMatchObject({
      Accept: "application/json",
    });
    expect(callUrl.searchParams.get("access_token")).toBe("test-token");
  });

  it("throws MetaGraphError on non-200 response", async () => {
    const errorBody = { error: { code: 190, message: "Invalid token" } };
    const fetchMock = mockFetch(400, errorBody, {
      "content-type": "application/json",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(graphGet("me/media")).rejects.toThrow(MetaGraphError);
    await expect(graphGet("me/media")).rejects.toMatchObject({
      status: 400,
      details: errorBody,
    });
  });

  it("parses Retry-After as integer seconds", async () => {
    const fetchMock = mockFetch(429, {}, {
      "content-type": "application/json",
      "retry-after": "120",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(graphGet("me/media")).rejects.toMatchObject({
      retryAfterSeconds: 120,
    });
  });

  it("parses Retry-After as HTTP-date", () => {
    // This tests the parseRetryAfter internal function via the error path
    const futureDate = new Date(Date.now() + 60_000).toUTCString();
    const fetchMock = mockFetch(429, {}, {
      "content-type": "application/json",
      "retry-after": futureDate,
    });
    vi.stubGlobal("fetch", fetchMock);

    return expect(graphGet("me/media")).rejects.toMatchObject({
      retryAfterSeconds: expect.any(Number),
    });
  });

  it("constructs correct URL with base and path", async () => {
    const fetchMock = mockFetch(200, {}, { "content-type": "application/json" });
    vi.stubGlobal("fetch", fetchMock);

    await graphGet("17841400000000000/media", { limit: 12 });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0].length).toBeGreaterThanOrEqual(1);
    const firstArg = fetchMock.mock.calls[0][0];
    expect(firstArg).toBeDefined();
    expect(typeof firstArg).toBe("object");
    expect(firstArg.toString()).toContain("graph.facebook.com/v25.0");
    expect(firstArg.toString()).toContain("limit=12");
  });

  it("handles text error responses", async () => {
    const fetchMock = mockFetch(500, "Internal Server Error", {
      "content-type": "text/plain",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(graphGet("me/media")).rejects.toMatchObject({
      status: 500,
      details: "Internal Server Error",
    });
  });
});
