import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TtlCache, profileCache, mediaCache, insightsCache } from "@/lib/cache";

describe("TtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves a value", () => {
    const cache = new TtlCache<string>();
    cache.set("key", "value", 60_000);
    expect(cache.get("key")).toBe("value");
  });

  it("returns undefined for a missing key", () => {
    const cache = new TtlCache<string>();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("returns undefined after TTL expires", () => {
    const cache = new TtlCache<string>();
    cache.set("key", "value", 10_000);
    vi.advanceTimersByTime(10_001);
    expect(cache.get("key")).toBeUndefined();
  });

  it("evicts expired entries on access", () => {
    const cache = new TtlCache<string>();
    cache.set("key1", "value1", 10_000);
    cache.set("key2", "value2", 60_000);
    vi.advanceTimersByTime(10_001);
    // get triggers eviction; key1 should be gone, key2 remains
    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBe("value2");
  });

  it("reports correct size excluding expired entries", () => {
    const cache = new TtlCache<string>();
    cache.set("key1", "value1", 10_000);
    cache.set("key2", "value2", 60_000);
    vi.advanceTimersByTime(10_001);
    expect(cache.size).toBe(1);
  });

  it("overwrites existing key", () => {
    const cache = new TtlCache<string>();
    cache.set("key", "old", 60_000);
    cache.set("key", "new", 60_000);
    expect(cache.get("key")).toBe("new");
  });

  it("deletes a key", () => {
    const cache = new TtlCache<string>();
    cache.set("key", "value", 60_000);
    cache.delete("key");
    expect(cache.get("key")).toBeUndefined();
  });

  it("has returns true for existing non-expired key", () => {
    const cache = new TtlCache<string>();
    cache.set("key", "value", 60_000);
    expect(cache.has("key")).toBe(true);
  });

  it("has returns false for expired key", () => {
    const cache = new TtlCache<string>();
    cache.set("key", "value", 10_000);
    vi.advanceTimersByTime(10_001);
    expect(cache.has("key")).toBe(false);
  });

  it("has returns false for missing key", () => {
    const cache = new TtlCache<string>();
    expect(cache.has("missing")).toBe(false);
  });

  it("clears all entries", () => {
    const cache = new TtlCache<string>();
    cache.set("key1", "value1", 60_000);
    cache.set("key2", "value2", 60_000);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("key1")).toBeUndefined();
  });
});

describe("singleton caches", () => {
  it("profileCache is a TtlCache instance", () => {
    expect(profileCache).toBeInstanceOf(TtlCache);
  });

  it("mediaCache is a TtlCache instance", () => {
    expect(mediaCache).toBeInstanceOf(TtlCache);
  });

  it("insightsCache is a TtlCache instance", () => {
    expect(insightsCache).toBeInstanceOf(TtlCache);
  });
});
