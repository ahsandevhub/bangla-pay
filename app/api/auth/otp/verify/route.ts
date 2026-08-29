import type { NextRequest } from "next/server";
import { createAuthService } from "@/lib/auth/auth.factory";
import { otpVerifySchema } from "@/lib/auth/auth.schema";
import { toResponse, validateRequest } from "@/lib/shared/http/handler";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = validateRequest(otpVerifySchema, body);
  if (!parsed.ok) return toResponse(parsed);

  const service = await createAuthService();
  const result = await service.verifyOtp(parsed.value.phone, parsed.value.purpose, parsed.value.code);
  return toResponse(result);
}
