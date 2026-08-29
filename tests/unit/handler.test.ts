import { describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { setDeviceTokenCookie, toResponse, validateRequest } from "@/lib/shared/http/handler";
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

describe("setDeviceTokenCookie", () => {
  // Regression: a hardcoded `secure: NODE_ENV === "production"` marks the
  // cookie Secure for any production *build*, including `next start` served
  // over plain HTTP for a local demo -- not only an actually-HTTPS
  // deployment. A Secure cookie is silently never sent back by the browser
  // over plain HTTP, which broke every device-gated route (transfers,
  // request accept, ...) with DEVICE_REPLACED the moment this ran as a
  // production build without TLS in front of it. Found by testing the real
  // production build end-to-end, not by unit/integration tests (which never
  // exercised NODE_ENV=production).
  it("is not Secure for a plain-HTTP request", () => {
    const request = new NextRequest("http://127.0.0.1:3000/api/auth/pin/setup");
    const response = NextResponse.json({});
    setDeviceTokenCookie(response, "raw-token", request);
    expect(response.cookies.get("bp_device_token")?.secure).toBe(false);
  });

  it("is Secure for an https:// request", () => {
    const request = new NextRequest("https://banglapay.example/api/auth/pin/setup");
    const response = NextResponse.json({});
    setDeviceTokenCookie(response, "raw-token", request);
    expect(response.cookies.get("bp_device_token")?.secure).toBe(true);
  });

  it("is Secure for a plain-HTTP request behind an HTTPS-terminating proxy (x-forwarded-proto)", () => {
    const request = new NextRequest("http://127.0.0.1:3000/api/auth/pin/setup", {
      headers: { "x-forwarded-proto": "https" },
    });
    const response = NextResponse.json({});
    setDeviceTokenCookie(response, "raw-token", request);
    expect(response.cookies.get("bp_device_token")?.secure).toBe(true);
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
