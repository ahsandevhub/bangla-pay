import type { NextRequest } from "next/server";
import { createAuthService } from "@/lib/auth/auth.factory";
import { pinChangeSchema } from "@/lib/auth/auth.schema";
import { toResponse, validateRequest, withAuth } from "@/lib/shared/http/handler";

// withAuth's Handler<C> takes one merged context object, not Next.js's own
// (request, routeParams) signature -- this adapts between the two, same
// pattern as app/api/auth/otp/send/route.ts.
const handler = withAuth(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const parsed = validateRequest(pinChangeSchema, body);
  if (!parsed.ok) return toResponse(parsed);

  const service = await createAuthService();
  const result = await service.changePin({
    newPin: parsed.value.newPin,
    confirmNewPin: parsed.value.confirmNewPin,
  });
  return toResponse(result);
});

export async function POST(request: NextRequest) {
  return handler({ request });
}
