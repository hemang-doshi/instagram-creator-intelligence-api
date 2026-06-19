import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireApiKey } from "@/lib/auth";

// Mock env for auth (requireEnvKeys checks CREATOR_API_KEY)
vi.mock("@/lib/env", () => ({
  requireEnvKeys: vi.fn(() => ({
    CREATOR_API_KEY: "test-key-12345-test-key-67890-test-key-abcde",
  })),
}));

function makeRequest(apiKey: string | null): Request {
  const headers = new Headers();
  if (apiKey !== null) {
    headers.set("x-api-key", apiKey);
  }
  return new Request("http://localhost/api/test", { headers });
}

describe("requireApiKey", () => {
  it("returns null for a valid API key", () => {
    const request = makeRequest("test-key-12345-test-key-67890-test-key-abcde");
    expect(requireApiKey(request)).toBeNull();
  });

  it("returns 401 for an invalid API key", async () => {
    const request = makeRequest("wrong-api-key");
    const response = requireApiKey(request);
    expect(response).toBeInstanceOf(Response);
    expect(response!.status).toBe(401);
  });

  it("returns 401 when x-api-key header is missing", async () => {
    const request = makeRequest(null);
    const response = requireApiKey(request);
    expect(response).toBeInstanceOf(Response);
    expect(response!.status).toBe(401);
  });

  it("returns 401 for an empty API key", async () => {
    const request = makeRequest("");
    const response = requireApiKey(request);
    expect(response).toBeInstanceOf(Response);
    expect(response!.status).toBe(401);
  });
});
