import type { NextRequest } from "next/server";
import { createAuthService } from "@/lib/auth/auth.factory";
import { otpSendSchema } from "@/lib/auth/auth.schema";
import { toResponse, validateRequest, withRateLimit } from "@/lib/shared/http/handler";

// The 60-second per-phone resend throttle is enforced in request_otp()
// itself (OTP_RESEND_TOO_SOON). This is a separate, coarser per-IP limit --
// not frozen anywhere in docs/CONTRACTS.md -- guarding against one caller
// cycling through many different phone numbers.
const handler = withRateLimit<{ request: NextRequest }>(
  "otp_send",
  10,
  300,
)(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const parsed = validateRequest(otpSendSchema, body);
  if (!parsed.ok) return toResponse(parsed);

  const service = await createAuthService();
  const result = await service.sendOtp(parsed.value.phone, parsed.value.purpose);
  return toResponse(result);
});

export async function POST(request: NextRequest) {
  return handler({ request });
}
