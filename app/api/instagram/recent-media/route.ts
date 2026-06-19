import { requireApiKey } from "@/lib/auth";
import { fetchRecentMedia } from "@/lib/instagram";
import { parseLimit } from "@/lib/normalize";
import { cachedJsonResponse, handleRouteError } from "@/lib/responses";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = requireApiKey(request);

  if (authError) {
    return authError;
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"), 12, 1, 50);

    return cachedJsonResponse(
      {
        items: await fetchRecentMedia(limit),
      },
      180, // 3-minute CDN TTL
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
