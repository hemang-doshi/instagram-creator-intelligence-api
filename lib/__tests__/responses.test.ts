import { describe, it, expect } from "vitest";
import {
  jsonResponse,
  cachedJsonResponse,
  errorResponse,
  handleRouteError,
} from "@/lib/responses";
import { MetaGraphError } from "@/lib/meta";
import { EnvError } from "@/lib/env";
import { RateLimitError } from "@/lib/rate-limiter";

describe("jsonResponse", () => {
  it("returns a JSON response with no-store cache", async () => {
    const res = jsonResponse({ ok: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("accepts a custom status code", async () => {
    const res = jsonResponse({ error: "bad" }, 400);
    expect(res.status).toBe(400);
  });
});

describe("cachedJsonResponse", () => {
  it("sets public cache headers with s-maxage", async () => {
    const res = cachedJsonResponse({ data: "test" }, 300);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=300",
    );
  });

  it("accepts custom stale-while-revalidate", async () => {
    const res = cachedJsonResponse({ data: "test" }, 300, 600);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=600",
    );
  });

  it("accepts a custom status code", async () => {
    const res = cachedJsonResponse({ error: "gone" }, 0, 0, 410);
    expect(res.status).toBe(410);
  });
});

describe("errorResponse", () => {
  it("returns structured error with no-store cache", async () => {
    const res = errorResponse(401, "Invalid key", "auth");
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body.error.message).toBe("Invalid key");
    expect(body.error.source).toBe("auth");
  });

  it("includes extra headers", async () => {
    const res = errorResponse(429, "Too fast", "meta_graph_api", {}, { "Retry-After": "30" });
    expect(res.headers.get("Retry-After")).toBe("30");
  });
});

describe("handleRouteError", () => {
  it("handles RateLimitError with 429 + Retry-After", async () => {
    const error = new RateLimitError(60);
    const res = handleRouteError(error);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("handles MetaGraphError with forwarded status and details", async () => {
    const error = new MetaGraphError(
      "Permission denied",
      403,
      { error: { code: 200, message: "insufficient permissions" } },
    );
    const res = handleRouteError(error);
    expect(res.status).toBe(403);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("handles MetaGraphError with Retry-After", async () => {
    const error = new MetaGraphError("Rate limited", 429, {}, 30);
    const res = handleRouteError(error);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  it("handles EnvError with 500 and missing keys", async () => {
    const error = new EnvError(["META_ACCESS_TOKEN", "IG_USER_ID"]);
    const res = handleRouteError(error);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.source).toBe("server");
    expect(body.error.details.missingEnv).toEqual(["META_ACCESS_TOKEN", "IG_USER_ID"]);
  });

  it("handles generic Error with 500", async () => {
    const error = new Error("Something broke");
    const res = handleRouteError(error);
    expect(res.status).toBe(500);
  });

  it("handles unknown throw with 500", async () => {
    const res = handleRouteError("string error");
    expect(res.status).toBe(500);
  });
});
