import type { NextRequest } from "next/server";
import { createRequestService } from "@/lib/requests/request.factory";
import { requestIdParamSchema } from "@/lib/requests/request.schema";
import { toResponse, validateRequest, withAuth, type RouteContext } from "@/lib/shared/http/handler";

type Context = RouteContext & { params: Promise<{ id: string }> };

const handler = withAuth<Context>(async ({ params }) => {
  const parsedParams = validateRequest(requestIdParamSchema, await params);
  if (!parsedParams.ok) return toResponse(parsedParams);

  const service = await createRequestService();
  const result = await service.decline({ requestId: parsedParams.value.id });
  return toResponse(result);
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handler({ request, params: context.params });
}
