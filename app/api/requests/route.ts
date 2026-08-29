import type { NextRequest } from "next/server";
import { createRequestService } from "@/lib/requests/request.factory";
import { createRequestSchema } from "@/lib/requests/request.schema";
import { toResponse, validateRequest, withAuth } from "@/lib/shared/http/handler";

export const dynamic = "force-dynamic";

const postHandler = withAuth(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const parsed = validateRequest(createRequestSchema, body);
  if (!parsed.ok) return toResponse(parsed);

  const service = await createRequestService();
  const result = await service.create({
    payerWallet: parsed.value.payerWallet,
    amount: parsed.value.amount,
    note: parsed.value.note ?? null,
  });
  return toResponse(result);
});

// The request inbox: the caller's own pending requests to pay.
const getHandler = withAuth(async () => {
  const service = await createRequestService();
  const result = await service.listPendingForPayer();
  return toResponse(result);
});

export async function POST(request: NextRequest) {
  return postHandler({ request });
}

export async function GET(request: NextRequest) {
  return getHandler({ request });
}
