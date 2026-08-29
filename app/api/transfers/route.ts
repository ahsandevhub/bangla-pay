import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createMoneyService } from "@/lib/money/money.factory";
import { transferRequestSchema } from "@/lib/money/money.schema";
import {
  toResponse,
  validateRequest,
  withActiveDevice,
  withAuth,
  withRateLimit,
  type RouteContext,
} from "@/lib/shared/http/handler";

type Authed = RouteContext & { userId: string; supabase: SupabaseClient<Database> };

// docs/ARCHITECTURE.md: "transfers permit 10 attempts per minute per user".
// withAuth must be outermost so withRateLimit sees a populated userId and
// keys the limit by user rather than falling back to IP.
const handler = withAuth<RouteContext>(
  withRateLimit<Authed>(
    "transfer",
    10,
    60,
  )(
    withActiveDevice<Authed>(async ({ request, deviceToken }) => {
      const body = await request.json().catch(() => null);
      const parsed = validateRequest(transferRequestSchema, {
        ...(typeof body === "object" && body !== null ? body : {}),
        // Frozen at the header per docs/ARCHITECTURE.md's API contract
        // ("POST /api/transfers  Idempotency-Key: <uuid>"), not the body.
        idempotencyKey: request.headers.get("Idempotency-Key"),
      });
      if (!parsed.ok) return toResponse(parsed);

      const service = await createMoneyService();
      const result = await service.transfer({
        destinationWallet: parsed.value.destinationWallet,
        amount: parsed.value.amount,
        idempotencyKey: parsed.value.idempotencyKey,
        note: parsed.value.note ?? null,
        deviceToken,
      });
      return toResponse(result);
    }),
  ),
);

export async function POST(request: NextRequest) {
  return handler({ request });
}
