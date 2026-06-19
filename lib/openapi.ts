import { getPublicAppName } from "@/lib/env";

const RATE_LIMIT_RESPONSE = {
  description:
    "Meta rate limit. The Retry-After header is forwarded from Meta's response.",
  headers: {
    "Retry-After": {
      description: "Seconds to wait before retrying.",
      schema: { type: "integer" },
    },
  },
};

export function buildOpenApiSchema(origin: string) {
  const appName = getPublicAppName();

  return {
    openapi: "3.1.0",
    info: {
      title: appName,
      version: "1.0.0",
      description:
        "Read-only Instagram Creator analytics wrapper for Custom GPT Actions. Use the reel report endpoint first for content analysis, then drill into profile or media-specific insights when needed. Targets Instagram Graph API v25.0.",
    },
    servers: [
      {
        url: origin,
        description: "Current deployment origin",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                message: { type: "string" },
                source: {
                  type: "string",
                  enum: ["meta_graph_api", "auth", "server", "rate_limit"],
                },
                details: {},
              },
              required: ["message", "source", "details"],
            },
          },
          required: ["error"],
        },
        InstagramProfile: {
          type: "object",
          description:
            "Normalized Instagram profile with account-level insights from the current day period.",
          properties: {
            id: { type: ["string", "null"] },
            username: { type: ["string", "null"] },
            name: { type: ["string", "null"] },
            biography: { type: ["string", "null"] },
            followersCount: { type: ["integer", "null"] },
            followsCount: { type: ["integer", "null"] },
            mediaCount: { type: ["integer", "null"] },
            profilePictureUrl: { type: ["string", "null"] },
            follows: {
              type: ["integer", "null"],
              description:
                "Daily follows from Meta's current follows/unfollows account-insights breakdown, or null when Meta does not return a follows breakdown for the account.",
            },
            profileVisits: {
              type: ["integer", "null"],
              description:
                "Profile views during the current day period from Meta account insights (`profile_views`).",
            },
            profileActivity: {
              type: ["integer", "null"],
              description:
                "Profile link/button taps during the current day period from Meta account insights (`profile_links_taps`).",
            },
          },
        },
        ReelReportSummary: {
          type: "object",
          description:
            "Precomputed totals across all Reels in the report. Use this instead of summing per-item values yourself.",
          properties: {
            reelCount: { type: "integer" },
            totalViews: { type: "integer" },
            totalReach: { type: "integer" },
            totalLikes: { type: "integer" },
            totalComments: { type: "integer" },
            totalSaved: { type: "integer" },
            totalShares: { type: "integer" },
            totalFollows: {
              type: ["integer", "null"],
              description:
                "Daily follows from Meta's current follows/unfollows account-insights breakdown, or null when Meta does not return a follows breakdown for the account.",
            },
            averageWatchTimeMs: {
              type: ["integer", "null"],
              description:
                "Average ig_reels_avg_watch_time in milliseconds, or null if the metric was unavailable.",
            },
          },
          required: [
            "reelCount",
            "totalViews",
            "totalReach",
            "totalLikes",
            "totalComments",
            "totalSaved",
            "totalShares",
            "totalFollows",
            "averageWatchTimeMs",
          ],
        },
      },
    },
    paths: {
      "/api/health": {
        get: {
          operationId: "getHealth",
          summary: "Check service health",
          description: "Returns a simple health payload. No authentication required.",
          responses: {
            "200": {
              description: "Service health response",
            },
          },
        },
      },
      "/api/instagram/profile": {
        get: {
          operationId: "getInstagramProfile",
          summary: "Get creator profile",
          description:
            "Fetches the Instagram creator or business profile metadata with account-level day-period insights appended.",
          security: [{ ApiKeyAuth: [] }],
          responses: {
            "200": {
              description: "Normalized Instagram profile with account insights",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/InstagramProfile" },
                },
              },
            },
            "401": { description: "Missing or invalid API key" },
            "429": RATE_LIMIT_RESPONSE,
            "500": { description: "Server or Meta Graph API error" },
          },
        },
      },
      "/api/instagram/recent-media": {
        get: {
          operationId: "getRecentInstagramMedia",
          summary: "Get recent Instagram media",
          description:
            "Returns the most recent Instagram media items with normalized engagement metadata. Use limit to control how many items are returned.",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "limit",
              in: "query",
              description: "Number of recent media items to return. Min 1, max 50.",
              schema: {
                type: "integer",
                default: 12,
                minimum: 1,
                maximum: 50,
              },
            },
          ],
          responses: {
            "200": { description: "Recent media list" },
            "401": { description: "Missing or invalid API key" },
            "429": RATE_LIMIT_RESPONSE,
            "500": { description: "Server or Meta Graph API error" },
          },
        },
      },
      "/api/instagram/media/{mediaId}/insights": {
        get: {
          operationId: "getInstagramMediaInsights",
          summary: "Get per-media insights",
          description:
            "Fetches Instagram insights for a single media item. Metrics are queried in separate groups so incompatible metrics return partial errors instead of failing the entire response.",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "mediaId",
              in: "path",
              required: true,
              description: "Instagram media ID to inspect.",
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            "200": { description: "Media insights response" },
            "401": { description: "Missing or invalid API key" },
            "429": RATE_LIMIT_RESPONSE,
            "500": { description: "Server or Meta Graph API error" },
          },
        },
      },
      "/api/instagram/reel-report": {
        get: {
          operationId: "getInstagramReelReport",
          summary: "Get recent Reels with insights and precomputed summary",
          description:
            "Primary analysis endpoint for Custom GPT. Returns only media_product_type === 'REELS' items, each with available per-media insights, plus a precomputed summary block of totals across all returned Reels.",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "limit",
              in: "query",
              description: "Number of Reels to analyze. Min 1, max 50.",
              schema: {
                type: "integer",
                default: 10,
                minimum: 1,
                maximum: 50,
              },
            },
          ],
          responses: {
            "200": { description: "Reel report response" },
            "401": { description: "Missing or invalid API key" },
            "429": RATE_LIMIT_RESPONSE,
            "500": { description: "Server or Meta Graph API error" },
          },
        },
      },
    },
  };
}
