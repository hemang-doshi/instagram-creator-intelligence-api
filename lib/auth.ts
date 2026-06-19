import { timingSafeEqual } from "node:crypto";

import { requireEnvKeys } from "@/lib/env";
import { errorResponse } from "@/lib/responses";

function safeCompare(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function requireApiKey(request: Request): Response | null {
  const env = requireEnvKeys(["CREATOR_API_KEY"]);
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey || !safeCompare(apiKey, env.CREATOR_API_KEY)) {
    return errorResponse(401, "Invalid or missing x-api-key header", "auth");
  }

  return null;
}
