import type { NextRequest } from "next/server";
import { createAuthService } from "@/lib/auth/auth.factory";
import { toResponse, withAuth } from "@/lib/shared/http/handler";

// Same no-body-needed shape as GET /api/requests -- withAuth(async () => ...).
const handler = withAuth(async () => {
  const service = await createAuthService();
  const result = await service.signOut();
  return toResponse(result);
});

export async function POST(request: NextRequest) {
  return handler({ request });
}
