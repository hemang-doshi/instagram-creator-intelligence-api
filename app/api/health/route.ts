import { getPublicAppName } from "@/lib/env";
import { jsonResponse } from "@/lib/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonResponse({
    ok: true,
    service: getPublicAppName(),
  });
}
