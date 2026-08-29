import type { NextRequest } from "next/server";
import { createMoneyService } from "@/lib/money/money.factory";
import { transactionHistoryQuerySchema } from "@/lib/money/money.schema";
import { toResponse, validateRequest, withAuth } from "@/lib/shared/http/handler";

// Balances/history are never cached (docs/ARCHITECTURE.md contract #8).
export const dynamic = "force-dynamic";

const handler = withAuth(async ({ request }) => {
  const parsed = validateRequest(transactionHistoryQuerySchema, {
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.ok) return toResponse(parsed);

  const service = await createMoneyService();
  const result = await service.listTransactionHistory({ cursor: parsed.value.cursor ?? null });
  return toResponse(result);
});

export async function GET(request: NextRequest) {
  return handler({ request });
}
