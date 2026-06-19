import { requireServerEnv } from "@/lib/env";
import { rateLimiter } from "@/lib/rate-limiter";

export class MetaGraphError extends Error {
  status: number;
  details: unknown;
  retryAfterSeconds: number | null;

  constructor(
    message: string,
    status: number,
    details: unknown,
    retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "MetaGraphError";
    this.status = status;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds;
  }

  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, Math.round((dateMs - Date.now()) / 1000));
  }

  return null;
}

export async function graphGet<T = Record<string, unknown>>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  // Throttle if approaching Meta's 200 calls/hour limit
  rateLimiter.consume();

  const env = requireServerEnv();
  const baseUrl = env.IG_GRAPH_BASE.endsWith("/")
    ? env.IG_GRAPH_BASE
    : `${env.IG_GRAPH_BASE}/`;
  const url = new URL(path.replace(/^\/+/, ""), baseUrl);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  // Meta's current Instagram/Graph API docs still show `access_token` as a
  // request parameter for these read endpoints. Keep auth aligned with the
  // documented request format rather than relying on bearer-header support.
  url.searchParams.set("access_token", env.META_ACCESS_TOKEN);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  // Sync rate limiter with Meta's observed usage from response headers
  rateLimiter.updateFromUsageHeaders(response.headers);

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as unknown)
    : await response.text();

  if (!response.ok) {
    const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
    throw new MetaGraphError(
      "Meta Graph API request failed",
      response.status,
      payload,
      retryAfter,
    );
  }

  return payload as T;
}
