import { requireApiKey } from "@/lib/auth";
import { collectMediaInsights } from "@/lib/instagram";
import { handleRouteError, jsonResponse } from "@/lib/responses";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: RouteContext<"/api/instagram/media/[mediaId]/insights">,
) {
  const authError = requireApiKey(request);

  if (authError) {
    return authError;
  }

  try {
    const { mediaId } = await context.params;

    return jsonResponse(await collectMediaInsights(mediaId));
  } catch (error) {
    return handleRouteError(error);
  }
}
