import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createRequestService } from "@/lib/requests/request.factory";
import { requestIdParamSchema } from "@/lib/requests/request.schema";
import {
  toResponse,
  validateRequest,
  withActiveDevice,
  withAuth,
  type RouteContext,
} from "@/lib/shared/http/handler";

type Context = RouteContext & { params: Promise<{ id: string }> };
type Authed = Context & { userId: string; supabase: SupabaseClient<Database> };

// settle_request uses the request's own id as its idempotency key (see
// supabase/migrations/20260829120700_money_functions.sql), so a retried
// accept can never double-pay regardless of the Idempotency-Key header
// docs/ARCHITECTURE.md documents on this route -- there is no separate
// client-supplied key for this endpoint to read or validate.
const handler = withAuth<Context>(
  withActiveDevice<Authed>(async ({ params, deviceToken }) => {
    const parsedParams = validateRequest(requestIdParamSchema, await params);
    if (!parsedParams.ok) return toResponse(parsedParams);

    const service = await createRequestService();
    const result = await service.accept({ requestId: parsedParams.value.id, deviceToken });
    return toResponse(result);
  }),
);

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handler({ request, params: context.params });
}
