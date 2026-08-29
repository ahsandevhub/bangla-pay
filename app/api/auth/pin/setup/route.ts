import type { NextRequest } from "next/server";
import { createAuthService } from "@/lib/auth/auth.factory";
import { pinSetupSchema } from "@/lib/auth/auth.schema";
import { ok } from "@/lib/shared/result";
import { setDeviceTokenCookie, toResponse, validateRequest } from "@/lib/shared/http/handler";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = validateRequest(pinSetupSchema, body);
  if (!parsed.ok) return toResponse(parsed);

  const service = await createAuthService();
  const result = await service.register({
    phone: parsed.value.phone,
    pin: parsed.value.pin,
    confirmPin: parsed.value.confirmPin,
    userAgent: request.headers.get("user-agent") ?? "unknown",
  });

  if (!result.ok) return toResponse(result);

  // The device token is only ever meant to live in the HttpOnly cookie set
  // below -- echoing it back in the JSON body would give client JS a way to
  // read it, defeating part of the point of HttpOnly.
  const response = toResponse(ok({ registered: true }));
  setDeviceTokenCookie(response, result.value.deviceToken);
  return response;
}
