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

export function getEnv(): AppEnv {
  return {
    IG_GRAPH_BASE: process.env.IG_GRAPH_BASE?.trim() || DEFAULT_GRAPH_BASE,
    IG_USER_ID: process.env.IG_USER_ID?.trim() || "",
    META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN?.trim() || "",
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
