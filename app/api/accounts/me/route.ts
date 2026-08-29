import type { NextRequest } from "next/server";
import { createAccountService } from "@/lib/accounts/account.factory";
import { toResponse, withAuth } from "@/lib/shared/http/handler";

// Balances are never cached (docs/ARCHITECTURE.md contract #8). withAuth
// already reads cookies, which opts this route out of static rendering, but
// force-dynamic makes that explicit rather than an implicit side effect.
export const dynamic = "force-dynamic";

const handler = withAuth(async ({ userId }) => {
  const service = await createAccountService();
  const result = await service.getOwnAccount(userId);
  return toResponse(result);
});

export async function GET(request: NextRequest) {
  return handler({ request });
}
