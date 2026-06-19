import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getEnv, requireServerEnv, requireEnvKeys, EnvError } from "@/lib/env";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("getEnv", () => {
  it("returns defaults when env vars are not set", () => {
    const env = getEnv();
    expect(env.IG_GRAPH_BASE).toBe("https://graph.facebook.com/v25.0");
    expect(env.NEXT_PUBLIC_APP_NAME).toBe("Instagram Creator Intelligence API");
  });

  it("reads values from environment", () => {
    process.env.IG_USER_ID = "test123";
    process.env.META_ACCESS_TOKEN = "token456";
    process.env.CREATOR_API_KEY = "key789";

    const env = getEnv();
    expect(env.IG_USER_ID).toBe("test123");
    expect(env.META_ACCESS_TOKEN).toBe("token456");
    expect(env.CREATOR_API_KEY).toBe("key789");
  });

  it("trims whitespace from values", () => {
    process.env.IG_USER_ID = "  test123  ";
    const env = getEnv();
    expect(env.IG_USER_ID).toBe("test123");
  });
});

describe("requireServerEnv", () => {
  it("returns env when all keys are present", () => {
    process.env.IG_USER_ID = "test";
    process.env.META_ACCESS_TOKEN = "token";
    process.env.CREATOR_API_KEY = "key";

    const env = requireServerEnv();
    expect(env.IG_USER_ID).toBe("test");
  });

  it("throws EnvError when keys are missing", () => {
    expect(() => requireServerEnv()).toThrow(EnvError);
  });

  it("lists all missing keys", () => {
    try {
      requireServerEnv();
    } catch (error) {
      if (error instanceof EnvError) {
        expect(error.missingKeys).toContain("IG_USER_ID");
        expect(error.missingKeys).toContain("META_ACCESS_TOKEN");
        expect(error.missingKeys).toContain("CREATOR_API_KEY");
      }
    }
  });
});

describe("requireEnvKeys", () => {
  it("returns env when specified keys are present", () => {
    process.env.CREATOR_API_KEY = "key123";
    const env = requireEnvKeys(["CREATOR_API_KEY"]);
    expect(env.CREATOR_API_KEY).toBe("key123");
  });

  it("throws EnvError when specified keys are missing", () => {
    expect(() => requireEnvKeys(["CREATOR_API_KEY"])).toThrow(EnvError);
  });
});
