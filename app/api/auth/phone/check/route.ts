import type { NextRequest } from "next/server";
import { createAuthService } from "@/lib/auth/auth.factory";
import { phoneCheckSchema } from "@/lib/auth/auth.schema";
import { toResponse, validateRequest } from "@/lib/shared/http/handler";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = validateRequest(phoneCheckSchema, body);
  if (!parsed.ok) return toResponse(parsed);

  const service = await createAuthService();
  const result = await service.checkPhone(parsed.value.phone);
  return toResponse(result);
}
