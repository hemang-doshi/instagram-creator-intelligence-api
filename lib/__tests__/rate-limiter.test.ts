import { describe, it, expect } from "vitest";
import { TokenBucket, RateLimitError } from "@/lib/rate-limiter";

describe("TokenBucket", () => {
  it("allows consuming tokens when available", () => {
    const bucket = new TokenBucket({ maxTokens: 10, refillIntervalMs: 60_000 });
    expect(() => bucket.consume()).not.toThrow();
    expect(bucket.remaining()).toBe(9);
  });

  it("throws RateLimitError when exhausted", () => {
    const bucket = new TokenBucket({ maxTokens: 2, refillIntervalMs: 60_000 });
    bucket.consume();
    bucket.consume();
    expect(() => bucket.consume()).toThrow(RateLimitError);
    expect(bucket.remaining()).toBe(0);
  });

  it("reports usage fraction correctly", () => {
    const bucket = new TokenBucket({ maxTokens: 10, refillIntervalMs: 60_000 });

    expect(bucket.usage).toBe(0);

    bucket.consume(5);
    expect(bucket.usage).toBe(0.5);
  });

  it("syncs from X-Business-Use-Case-Usage header", () => {
    const bucket = new TokenBucket({ maxTokens: 200, refillIntervalMs: 3_600_000 });
    const headers = new Headers({
      "X-Business-Use-Case-Usage": JSON.stringify({
        ig_api_usage: [{ acc_id_util_pct: 50 }],
      }),
    });

    bucket.updateFromUsageHeaders(headers);
    expect(bucket.remaining()).toBe(100); // 50% used = 100 remaining
  });

  it("ignores malformed usage header gracefully", () => {
    const bucket = new TokenBucket({ maxTokens: 200, refillIntervalMs: 3_600_000 });
    const headers = new Headers({
      "X-Business-Use-Case-Usage": "not-json",
    });

    expect(() => bucket.updateFromUsageHeaders(headers)).not.toThrow();
  });

  it("ignores missing usage header", () => {
    const bucket = new TokenBucket({ maxTokens: 200, refillIntervalMs: 3_600_000 });
    const headers = new Headers();

    expect(() => bucket.updateFromUsageHeaders(headers)).not.toThrow();
  });

  it("uses default config values", () => {
    const bucket = new TokenBucket();
    expect(bucket.remaining()).toBe(200);
    expect(bucket.usage).toBe(0);
  });
});
