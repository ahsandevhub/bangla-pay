import type { NextRequest } from "next/server";
import { createAuthService } from "@/lib/auth/auth.factory";
import { pinLoginSchema } from "@/lib/auth/auth.schema";
import { ok } from "@/lib/shared/result";
import {
  DEVICE_TOKEN_COOKIE,
  setDeviceTokenCookie,
  toResponse,
  validateRequest,
} from "@/lib/shared/http/handler";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = validateRequest(pinLoginSchema, body);
  if (!parsed.ok) return toResponse(parsed);

  const service = await createAuthService();
  const result = await service.login({
    phone: parsed.value.phone,
    pin: parsed.value.pin,
    deviceToken: request.cookies.get(DEVICE_TOKEN_COOKIE)?.value ?? null,
    userAgent: request.headers.get("user-agent") ?? "unknown",
  });

  if (!result.ok) return toResponse(result);

  // See app/api/auth/pin/setup/route.ts: never echo the raw device token in
  // the JSON body, only ever set it as the HttpOnly cookie.
  const response = toResponse(ok({ loggedIn: true }));
  if (result.value.deviceToken) {
    setDeviceTokenCookie(response, result.value.deviceToken);
  }
  return response;
}
