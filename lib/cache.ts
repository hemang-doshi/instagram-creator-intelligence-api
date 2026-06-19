export class TtlCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();

  get(key: string): T | undefined {
    this.evict();
    const entry = this.store.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.evict();
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    this.evict();
    const entry = this.store.get(key);
    return entry !== undefined && entry.expiresAt > Date.now();
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    this.evict();
    return this.store.size;
  }

  private evict(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }
}

// Pre-configured singleton caches for different data categories.
// These are per-serverless-instance — they won't share state across
// cold starts but provide dedup within warm instances.

/** Profile data: 5-minute TTL */
export const profileCache = new TtlCache<unknown>();

/** Media list data: 3-minute TTL */
export const mediaCache = new TtlCache<unknown>();

/** Insight (account + media) data: 3-minute TTL */
export const insightsCache = new TtlCache<unknown>();
