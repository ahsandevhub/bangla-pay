import { describe, expect, it } from "vitest";
import { toResponse, validateRequest } from "@/lib/shared/http/handler";
import { ok, err } from "@/lib/shared/result";
import { appError } from "@/lib/shared/errors/app-error";
import { z } from "zod";

describe("toResponse", () => {
  it("serializes a plain success value", async () => {
    const response = toResponse(ok({ foo: "bar" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { foo: "bar" } });
  });

  it("does not throw on a bigint value -- NextResponse.json()'s plain JSON.stringify would", async () => {
    // Regression test: KycVerificationOutcome.balancePoisha (and eventually
    // TransferOutcome/AccountSummary) cross the HTTP boundary as bigint.
    // Confirmed by testing that a naive NextResponse.json({...bigint}) call
    // throws "Do not know how to serialize a BigInt" outright -- this would
    // have 500'd every successful /api/kyc/verify response.
    const response = toResponse(ok({ balancePoisha: 10000000n }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ data: { balancePoisha: "10000000" } });
  });

  it("serializes a negative bigint (the system account's balance) as a string too", async () => {
    const response = toResponse(ok({ balancePoisha: -10000000n }));
    const body = await response.json();
    expect(body.data.balancePoisha).toBe("-10000000");
  });

  it("maps an error result to its HTTP status and body", async () => {
    const response = toResponse(err(appError("INSUFFICIENT_FUNDS", "Insufficient balance.")));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: { code: "INSUFFICIENT_FUNDS", message: "Insufficient balance." },
    });
  });
});

describe("validateRequest", () => {
  const schema = z.object({ amount: z.string() });

  it("returns ok for valid data", () => {
    const result = validateRequest(schema, { amount: "100" });
    expect(result).toEqual(ok({ amount: "100" }));
  });

  it("returns a VALIDATION_ERROR with fieldErrors for invalid data", () => {
    const result = validateRequest(schema, { amount: 100 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.fieldErrors?.amount).toBeDefined();
    }
  });
});
