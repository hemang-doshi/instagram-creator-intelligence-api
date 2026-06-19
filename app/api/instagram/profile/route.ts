import { requireApiKey } from "@/lib/auth";
import { requireServerEnv } from "@/lib/env";
import { fetchAccountInsights } from "@/lib/instagram";
import { graphGet } from "@/lib/meta";
import { normalizeProfile } from "@/lib/normalize";
import { cachedJsonResponse, handleRouteError } from "@/lib/responses";

export const dynamic = "force-dynamic";

const PROFILE_FIELDS = [
  "id",
  "username",
  "name",
  "biography",
  "followers_count",
  "follows_count",
  "media_count",
  "profile_picture_url",
].join(",");

export async function GET(request: Request) {
  const authError = requireApiKey(request);

  if (authError) {
    return authError;
  }

  try {
    const env = requireServerEnv();
    const [profile, accountInsights] = await Promise.all([
      graphGet<Record<string, unknown>>(env.IG_USER_ID, {
        fields: PROFILE_FIELDS,
      }),
      fetchAccountInsights(),
    ]);

    return cachedJsonResponse(
      {
        ...normalizeProfile(profile),
        follows: accountInsights.follows,
        profileVisits: accountInsights.profileVisits,
        profileActivity: accountInsights.profileActivity,
      },
      300, // 5-minute CDN TTL
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
