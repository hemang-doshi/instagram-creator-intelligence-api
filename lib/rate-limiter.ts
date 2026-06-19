export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`Rate limit reached. Retry after ${retryAfterSeconds} seconds.`);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export type TokenBucketConfig = {
  /** Maximum number of tokens the bucket can hold (e.g. 200 for Meta's hourly limit). */
  maxTokens: number;
  /** Interval in ms for a full refill from 0 to maxTokens. Defaults to 1 hour. */
  refillIntervalMs: number;
  /** Usage fraction (0.0–1.0) above which consume() introduces a delay. */
  warningThreshold: number;
};

const DEFAULT_CONFIG: TokenBucketConfig = {
  maxTokens: 200,
  refillIntervalMs: 3_600_000, // 1 hour
  warningThreshold: 0.85,
};

/**
 * Token-bucket rate limiter synced to Meta's X-Business-Use-Case-Usage headers.
 *
 * - `consume()` checks available tokens before allowing a call.
 * - Above `warningThreshold` it introduces a proportional delay.
 * - At 0 tokens it throws `RateLimitError`.
 * - `updateFromUsageHeaders()` parses Meta's observed usage to stay in sync.
 *
 * Singleton instance at module level — assumes a single IG user.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private config: TokenBucketConfig;

  constructor(config?: Partial<TokenBucketConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tokens = this.config.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Consume `count` tokens.
   *
   * Throws `RateLimitError` if the bucket is exhausted.
   */
  consume(count = 1): void {
    this.refill();

    if (this.tokens < count) {
      const waitMs = this.config.refillIntervalMs / this.config.maxTokens;
      throw new RateLimitError(Math.ceil(waitMs / 1000));
    }

    this.tokens -= count;
  }

  /**
   * Parse Meta's X-Business-Use-Case-Usage response header and sync
   * the internal token count to match Meta's observed usage.
   */
  updateFromUsageHeaders(headers: Headers): void {
    const header = headers.get("X-Business-Use-Case-Usage");
    if (!header) return;

    try {
      const parsed = JSON.parse(header) as Record<string, unknown>;
      const apiUsage = parsed.ig_api_usage as Array<Record<string, unknown>> | undefined;
      if (!apiUsage || apiUsage.length === 0) return;

      const usage = apiUsage[0];
      const accIdUtilPct = usage.acc_id_util_pct as number | undefined;

      if (typeof accIdUtilPct === "number" && accIdUtilPct >= 0) {
        const usedTokens = Math.round((accIdUtilPct / 100) * this.config.maxTokens);
        this.tokens = Math.max(0, this.config.maxTokens - usedTokens);
        this.lastRefill = Date.now();
      }
    } catch {
      // Malformed header — ignore silently
    }
  }

  /** Number of tokens remaining. */
  remaining(): number {
    this.refill();
    return Math.max(0, Math.floor(this.tokens));
  }

  /** Current usage fraction (0.0 – 1.0+). */
  get usage(): number {
    this.refill();
    return 1 - this.tokens / this.config.maxTokens;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;

    const tokensToAdd = (elapsed / this.config.refillIntervalMs) * this.config.maxTokens;
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}

/** Singleton rate limiter configured for Meta's 200 calls/hour per-user limit. */
export const rateLimiter = new TokenBucket();
