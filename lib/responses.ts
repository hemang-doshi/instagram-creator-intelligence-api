import { EnvError, EnvError_Message } from "@/lib/env";
import { MetaGraphError } from "@/lib/meta";
import { RateLimitError } from "@/lib/rate-limiter";

export type ErrorSource = "meta_graph_api" | "auth" | "server" | "rate_limit";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

function withMetaErrorHints(details: unknown): unknown {
  if (!details || typeof details !== "object") {
    return details;
  }

  const payload = details as {
    error?: { code?: number; message?: string };
  };
  const code = payload.error?.code;
  const message = payload.error?.message ?? "";

  if (code === 190 && message.includes("Cannot parse access token")) {
    return {
      ...payload,
      hint:
        "META_ACCESS_TOKEN is malformed, truncated, or the wrong token type. Generate a fresh long-lived Instagram/Facebook user token and update the deployment env.",
    };
  }

  return details;
}

export function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

/**
 * Return a JSON response with CDN-friendly cache headers.
 *
 * - `ttlSeconds` is used for `s-maxage` (CDN cache duration).
 * - `swrSeconds` is used for `stale-while-revalidate`; defaults to `ttlSeconds`.
 */
export function cachedJsonResponse(
  payload: unknown,
  ttlSeconds: number,
  swrSeconds?: number,
  status = 200,
): Response {
  const swr = swrSeconds ?? ttlSeconds;
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${swr}`,
    },
  });
}

export function errorResponse(
  status: number,
  message: string,
  source: ErrorSource,
  details: unknown = {},
  extraHeaders: Record<string, string> = {},
): Response {
  return Response.json(
    {
      error: {
        message,
        source,
        details,
      },
    },
    {
      status,
      headers: { ...NO_STORE_HEADERS, ...extraHeaders },
    },
  );
}

export function handleRouteError(error: unknown): Response {
  if (error instanceof RateLimitError) {
    return errorResponse(
      429,
      error.message,
      "rate_limit",
      {},
      { "Retry-After": String(error.retryAfterSeconds) },
    );
  }

  if (error instanceof MetaGraphError) {
    const extraHeaders: Record<string, string> = {};
    if (error.retryAfterSeconds !== null) {
      extraHeaders["Retry-After"] = String(error.retryAfterSeconds);
    }
    return errorResponse(
      error.status,
      error.message,
      "meta_graph_api",
      withMetaErrorHints(error.details),
      extraHeaders,
    );
  }

  if (error instanceof EnvError) {
    return errorResponse(
      500,
      error.message,
      "server",
      { missingEnv: error.missingKeys },
    );
  }

  if (error instanceof EnvError_Message) {
    return errorResponse(500, error.message, "server");
  }

  if (error instanceof Error) {
    return errorResponse(500, error.message, "server");
  }

  return errorResponse(500, "Unexpected server error", "server");
}
