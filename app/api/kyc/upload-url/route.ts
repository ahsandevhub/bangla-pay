import type { NextRequest } from "next/server";
import { createKycService } from "@/lib/kyc/kyc.factory";
import { kycUploadUrlSchema } from "@/lib/kyc/kyc.schema";
import { toResponse, validateRequest, withAuth } from "@/lib/shared/http/handler";

const handler = withAuth(async ({ request, userId }) => {
  const body = await request.json().catch(() => null);
  const parsed = validateRequest(kycUploadUrlSchema, body);
  if (!parsed.ok) return toResponse(parsed);

  const service = await createKycService();
  const result = await service.requestUploadUrl(userId, parsed.value.fileExtension);
  return toResponse(result);
});

export async function POST(request: NextRequest) {
  return handler({ request });
}
