import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

// Optimistic redirects only (docs/ARCHITECTURE.md: "proxy.ts performs
// optimistic redirects only. Protected layouts, services, repositories, and
// RPC functions perform authoritative checks."). This never decides
// PENDING_KYC vs ACTIVE -- that would need a DB round trip on every matched
// request -- it only redirects on whether a session exists at all. The
// PENDING_KYC-vs-ACTIVE distinction is resolved client-side (auth-flow.tsx
// right after login/registration, and dashboard-flow.tsx defensively on
// direct navigation) via the real GET /api/accounts/me call, which is
// authoritative regardless of what this optimistic check assumed.
const PROTECTED_PATHS = ["/dashboard", "/kyc"];
const AUTH_PATHS = ["/login", "/register"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && !!data?.claims.sub;
  const path = request.nextUrl.pathname;

  if (!isAuthenticated && PROTECTED_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
