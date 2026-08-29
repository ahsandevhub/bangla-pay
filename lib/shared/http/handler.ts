import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { type Result, ok, err } from "@/lib/shared/result";
import {
  type AppError,
  appError,
  defaultMessageForErrorCode,
  httpStatusForErrorCode,
} from "@/lib/shared/errors/app-error";
import { appErrorFromSupabaseError } from "@/lib/shared/errors/from-supabase-error";

/**
 * Route-boundary Zod validation, per docs/ARCHITECTURE.md ("Route handlers
 * perform HTTP parsing and Zod validation, then call services"). Every
 * route needs this identically, so it lives here rather than being
 * duplicated per handler.
 */
export function validateRequest<T>(schema: ZodType<T>, data: unknown): Result<T, AppError> {
  const parsed = schema.safeParse(data);
  if (parsed.success) {
    return ok(parsed.data);
  }

  // Zod's flatten() return type is generic over the schema's output type,
  // which is unresolved in this generic context and infers fieldErrors'
  // value type as `{}` rather than `string[]` -- Array.isArray narrows
  // around that rather than fighting the inference.
  const fieldErrors: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
    if (Array.isArray(messages)) fieldErrors[field] = messages as string[];
  }

  return err(appError("VALIDATION_ERROR", defaultMessageForErrorCode("VALIDATION_ERROR"), fieldErrors));
}

/**
 * Money crosses the HTTP boundary as `bigint` (KycVerificationOutcome,
 * eventually TransferOutcome/AccountSummary in Phase 6) -- plain
 * NextResponse.json() calls JSON.stringify() internally, which throws
 * "Do not know how to serialize a BigInt" outright. Confirmed by testing:
 * this would have 500'd every successful /api/kyc/verify response. Building
 * the Response manually with a stringify replacer is the one place this
 * needs handling, rather than converting bigint -> string in every type
 * that might eventually hold money.
 */
function jsonResponse(body: unknown, status: number): NextResponse {
  const json = JSON.stringify(body, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
  return new NextResponse(json, { status, headers: { "content-type": "application/json" } });
}

/**
 * The one place that maps a domain Result to an HTTP response, per
 * docs/ARCHITECTURE.md ("Only the shared HTTP handler maps domain codes to
 * status codes and public messages"). Route handlers should never construct
 * NextResponse.json themselves for a Result -- always go through this.
 */
export function toResponse<T>(result: Result<T, AppError>): NextResponse {
  if (result.ok) {
    return jsonResponse({ data: result.value }, 200);
  }
  return jsonResponse({ error: result.error }, httpStatusForErrorCode(result.error.code));
}

function errorResponse(code: Parameters<typeof appError>[0]): NextResponse {
  return toResponse({ ok: false, error: appError(code, defaultMessageForErrorCode(code)) });
}

export type RouteContext = {
  request: NextRequest;
};

type Handler<C> = (context: C) => Promise<NextResponse>;

/**
 * Requires a signed-in Supabase session; passes the caller's user id and a
 * request-scoped Supabase client (respects RLS) to the wrapped handler.
 * getClaims() verifies the JWT (locally, via JWKS, when the project uses
 * asymmetric signing keys) rather than trusting an unverified cookie value.
 */
export function withAuth<C extends RouteContext>(
  handler: Handler<C & { userId: string; supabase: SupabaseClient<Database> }>,
): Handler<C> {
  return async (context) => {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;

    if (error || !userId) {
      return errorResponse("UNAUTHENTICATED");
    }

    return handler({ ...context, userId, supabase });
  };
}

// Set on the trusted browser during registration/device-login (Phase 4).
// Only its SHA-256 hash is ever stored server-side (trusted_devices.token_hash);
// this wrapper's job is solely to extract the raw cookie value and forward it
// -- assert_active_device() in Postgres is the authoritative check.
export const DEVICE_TOKEN_COOKIE = "bp_device_token";

/**
 * Requires the trusted-device cookie to be present and forwards its raw
 * value as `deviceToken`. Does not itself validate the token against the
 * database -- every money RPC calls assert_active_device() internally, per
 * docs/ARCHITECTURE.md ("services, repositories, and RPC functions perform
 * authoritative checks").
 */
// 400 days is the practical maximum Chrome/Chromium will honor for a cookie;
// device trust otherwise persists until explicitly revoked (device
// replacement), not on a fixed schedule.
const DEVICE_TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

/**
 * `NODE_ENV === "production"` is true for any production *build*, including
 * `next start` served over plain HTTP for a local demo -- not just an
 * actually-HTTPS deployment. A `Secure` cookie set over plain HTTP is
 * silently dropped/never sent back by the browser, which made every
 * device-gated route (transfers, request accept, ...) fail as
 * DEVICE_REPLACED the moment this ran as a production build without TLS in
 * front of it. Deriving from the request's own protocol (falling back to
 * the standard reverse-proxy header) reflects the actual connection instead.
 */
function isSecureRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) return forwardedProto === "https";
  return request.nextUrl.protocol === "https:";
}

/** Sets the trusted-device cookie on a response (registration, new-device login). */
export function setDeviceTokenCookie(response: NextResponse, deviceToken: string, request: NextRequest): void {
  response.cookies.set(DEVICE_TOKEN_COOKIE, deviceToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request),
    path: "/",
    maxAge: DEVICE_TOKEN_COOKIE_MAX_AGE_SECONDS,
  });
}

export function withActiveDevice<C extends RouteContext>(
  handler: Handler<C & { deviceToken: string }>,
): Handler<C> {
  return async (context) => {
    const deviceToken = context.request.cookies.get(DEVICE_TOKEN_COOKIE)?.value;
    if (!deviceToken) {
      return errorResponse("DEVICE_REPLACED");
    }
    return handler({ ...context, deviceToken });
  };
}

/**
 * Calls the check_rate_limit RPC before proceeding. Keys by userId when the
 * context already has one (from a preceding withAuth), otherwise falls back
 * to the caller's IP -- some rate-limited routes (e.g. OTP send) run before
 * the caller is authenticated.
 */
export function withRateLimit<C extends RouteContext & { userId?: string }>(
  action: string,
  limit: number,
  windowSeconds: number,
): (handler: Handler<C>) => Handler<C> {
  return (handler) => async (context) => {
    const supabase = await createClient();
    const identifier = context.userId ?? ipFromRequest(context.request);

    const { error } = await supabase.rpc("check_rate_limit", {
      p_action: action,
      p_identifier: identifier,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      return toResponse({ ok: false, error: appErrorFromSupabaseError(error) });
    }

    return handler(context);
  };
}

function ipFromRequest(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
