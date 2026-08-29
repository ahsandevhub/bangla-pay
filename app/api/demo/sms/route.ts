import type { NextRequest } from "next/server";
import { createAuthService } from "@/lib/auth/auth.factory";
import { demoSmsQuerySchema } from "@/lib/auth/auth.schema";
import { toResponse, validateRequest } from "@/lib/shared/http/handler";

export async function GET(request: NextRequest) {
  const parsed = validateRequest(demoSmsQuerySchema, {
    inboxToken: request.nextUrl.searchParams.get("inboxToken"),
  });
  if (!parsed.ok) return toResponse(parsed);

  const service = await createAuthService();
  const result = await service.readDemoSms(parsed.value.inboxToken);
  return toResponse(result);
}
