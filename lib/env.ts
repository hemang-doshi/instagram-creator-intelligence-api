const DEFAULT_GRAPH_BASE = "https://graph.facebook.com/v25.0";
const DEFAULT_APP_NAME = "Instagram Creator Intelligence API";

export type ServerEnvKey =
  | "IG_GRAPH_BASE"
  | "IG_USER_ID"
  | "META_ACCESS_TOKEN"
  | "CREATOR_API_KEY";

export type AppEnv = {
  IG_GRAPH_BASE: string;
  IG_USER_ID: string;
  META_ACCESS_TOKEN: string;
  CREATOR_API_KEY: string;
  NEXT_PUBLIC_APP_NAME: string;
};

export class EnvError extends Error {
  missingKeys: ServerEnvKey[];

  constructor(missingKeys: ServerEnvKey[]) {
    super(`Missing required environment variables: ${missingKeys.join(", ")}`);
    this.name = "EnvError";
    this.missingKeys = missingKeys;
  }
}

/**
 * Validates that META_ACCESS_TOKEN is a raw token — no Bearer prefix, no
 * JSON wrapping, no quotes, no `access_token=` query-string style.
 *
 * Meta returns an opaque string like `EAATnQ...`. Wrapping it causes a
 * "Cannot parse access token" error that is hard to distinguish from
 * an expired or invalid token. This check fails early with a clear
 * message so you can fix the env var directly in the Vercel dashboard.
 */
function validateMetaToken(raw: string): string {
  const token = raw.trim();

  if (!token) return token;

  if (
    token.startsWith("Bearer ") ||
    token.startsWith("bearer ")
  ) {
    throw new EnvError_Message(
      "META_ACCESS_TOKEN must NOT include a 'Bearer' prefix. Set the raw token only.",
    );
  }

  if (token.startsWith("access_token=")) {
    throw new EnvError_Message(
      "META_ACCESS_TOKEN must NOT include an 'access_token=' prefix. Set the raw token only.",
    );
  }

  if (token.startsWith("{") || token.startsWith("[")) {
    throw new EnvError_Message(
      "META_ACCESS_TOKEN looks like JSON. Set the raw token string only, not a JSON object or array.",
    );
  }

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    throw new EnvError_Message(
      "META_ACCESS_TOKEN must NOT be wrapped in quotes. Set the raw token only.",
    );
  }

  return token;
}

/** Thrown when an env var value is structurally invalid (not just missing). */
export class EnvError_Message extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

export function getEnv(): AppEnv {
  return {
    IG_GRAPH_BASE: process.env.IG_GRAPH_BASE?.trim() || DEFAULT_GRAPH_BASE,
    IG_USER_ID: process.env.IG_USER_ID?.trim() || "",
    META_ACCESS_TOKEN: validateMetaToken(process.env.META_ACCESS_TOKEN?.trim() || ""),
    CREATOR_API_KEY: process.env.CREATOR_API_KEY?.trim() || "",
    NEXT_PUBLIC_APP_NAME:
      process.env.NEXT_PUBLIC_APP_NAME?.trim() || DEFAULT_APP_NAME,
  };
}

export function getPublicAppName(): string {
  return getEnv().NEXT_PUBLIC_APP_NAME;
}

export function getMissingServerEnv(): ServerEnvKey[] {
  const env = getEnv();
  const requiredKeys: ServerEnvKey[] = [
    "IG_GRAPH_BASE",
    "IG_USER_ID",
    "META_ACCESS_TOKEN",
    "CREATOR_API_KEY",
  ];

  return requiredKeys.filter((key) => !env[key]);
}

export function requireEnvKeys(keys: ServerEnvKey[]): AppEnv {
  const env = getEnv();
  const missingKeys = keys.filter((key) => !env[key]);

  if (missingKeys.length > 0) {
    throw new EnvError(missingKeys);
  }

  return env;
}

export function requireServerEnv(): AppEnv {
  return requireEnvKeys([
    "IG_GRAPH_BASE",
    "IG_USER_ID",
    "META_ACCESS_TOKEN",
    "CREATOR_API_KEY",
  ]);
}
