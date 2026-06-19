import { buildOpenApiSchema } from "@/lib/openapi";
import { jsonResponse } from "@/lib/responses";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  return jsonResponse(buildOpenApiSchema(origin));
}
