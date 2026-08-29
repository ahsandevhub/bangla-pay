import type { PostgrestError } from "@supabase/supabase-js";
import {
  type AppError,
  appError,
  defaultMessageForErrorCode,
  isAppErrorCode,
} from "@/lib/shared/errors/app-error";

/**
 * Money/KYC RPC functions raise plain `RAISE EXCEPTION '<CODE>'` in
 * PostgreSQL (see supabase/migrations); Supabase surfaces the exception text
 * verbatim as `error.message`. This is the one place that trusts a raw
 * Postgres error message as a domain code -- everywhere else, per
 * docs/ARCHITECTURE.md, "public errors never include raw PostgreSQL or
 * Supabase messages". Anything that isn't one of our frozen codes (a
 * constraint violation, a connection error, ...) collapses to INTERNAL_ERROR
 * so nothing raw ever reaches a client.
 */
export function appErrorFromSupabaseError(error: PostgrestError): AppError {
  if (isAppErrorCode(error.message)) {
    return appError(error.message, defaultMessageForErrorCode(error.message));
  }
  return appError("INTERNAL_ERROR", defaultMessageForErrorCode("INTERNAL_ERROR"));
}
