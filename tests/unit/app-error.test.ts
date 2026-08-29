import { describe, expect, it } from "vitest";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  APP_ERROR_CODES,
  appError,
  defaultMessageForErrorCode,
  httpStatusForErrorCode,
  isAppErrorCode,
} from "@/lib/shared/errors/app-error";
import { appErrorFromSupabaseError } from "@/lib/shared/errors/from-supabase-error";

describe("app error code registry", () => {
  it("has no duplicate codes", () => {
    expect(new Set(APP_ERROR_CODES).size).toBe(APP_ERROR_CODES.length);
  });

  it("maps every code to an HTTP status and a default message", () => {
    for (const code of APP_ERROR_CODES) {
      const status = httpStatusForErrorCode(code);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
      expect(defaultMessageForErrorCode(code)).toBeTruthy();
    }
  });

  it("recognizes a frozen code and rejects an arbitrary string", () => {
    expect(isAppErrorCode("INSUFFICIENT_FUNDS")).toBe(true);
    expect(isAppErrorCode("something_raw_from_postgres")).toBe(false);
  });

  it("appError omits fieldErrors when not provided", () => {
    const error = appError("VALIDATION_ERROR", "bad input");
    expect(error).toEqual({ code: "VALIDATION_ERROR", message: "bad input" });
    expect(error).not.toHaveProperty("fieldErrors");
  });

  it("appError includes fieldErrors when provided", () => {
    const error = appError("VALIDATION_ERROR", "bad input", { amount: ["required"] });
    expect(error.fieldErrors).toEqual({ amount: ["required"] });
  });
});

describe("appErrorFromSupabaseError", () => {
  function fakePostgrestError(message: string): PostgrestError {
    return {
      message,
      details: "",
      hint: "",
      code: "P0001",
      name: "PostgrestError",
      toJSON: () => ({ message, details: "", hint: "", code: "P0001", name: "PostgrestError" }),
    };
  }

  it("maps a known RAISE EXCEPTION message to its domain code", () => {
    const result = appErrorFromSupabaseError(fakePostgrestError("INSUFFICIENT_FUNDS"));
    expect(result.code).toBe("INSUFFICIENT_FUNDS");
    expect(result.message).toBe(defaultMessageForErrorCode("INSUFFICIENT_FUNDS"));
  });

  it("never leaks a raw, unrecognized Postgres message to the client", () => {
    const result = appErrorFromSupabaseError(
      fakePostgrestError('duplicate key value violates unique constraint "accounts_wallet_number_key"'),
    );
    expect(result.code).toBe("INTERNAL_ERROR");
    expect(result.message).not.toMatch(/constraint|duplicate key/i);
  });
});
