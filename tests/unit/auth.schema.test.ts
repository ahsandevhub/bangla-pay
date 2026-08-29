import { describe, expect, it } from "vitest";
import {
  demoSmsQuerySchema,
  otpSendSchema,
  otpVerifySchema,
  phoneCheckSchema,
  pinChangeSchema,
  pinLoginSchema,
  pinSetupSchema,
} from "@/lib/auth/auth.schema";

describe("phoneCheckSchema", () => {
  it.each(["01711000001", "+8801711000001"])("accepts local and canonical forms (%s)", (phone) => {
    expect(phoneCheckSchema.safeParse({ phone }).success).toBe(true);
  });

  it("rejects a malformed phone", () => {
    expect(phoneCheckSchema.safeParse({ phone: "not-a-phone" }).success).toBe(false);
  });
});

describe("otpSendSchema / otpVerifySchema", () => {
  it("accepts every OTP purpose", () => {
    for (const purpose of ["REGISTRATION", "DEVICE_LOGIN", "PIN_CHANGE"]) {
      expect(otpSendSchema.safeParse({ phone: "01711000001", purpose }).success).toBe(true);
    }
  });

  it("rejects an unknown purpose", () => {
    expect(otpSendSchema.safeParse({ phone: "01711000001", purpose: "SOMETHING_ELSE" }).success).toBe(
      false,
    );
  });

  it("verify requires a six-digit code", () => {
    const base = { phone: "01711000001", purpose: "REGISTRATION" as const };
    expect(otpVerifySchema.safeParse({ ...base, code: "123456" }).success).toBe(true);
    expect(otpVerifySchema.safeParse({ ...base, code: "12345" }).success).toBe(false);
    expect(otpVerifySchema.safeParse({ ...base, code: "abcdef" }).success).toBe(false);
  });
});

describe("demoSmsQuerySchema", () => {
  it("requires a UUID inboxToken", () => {
    expect(demoSmsQuerySchema.safeParse({ inboxToken: "cccccccc-0000-4000-8000-000000000001" }).success).toBe(
      true,
    );
    expect(demoSmsQuerySchema.safeParse({ inboxToken: "not-a-uuid" }).success).toBe(false);
  });
});

describe("pinSetupSchema / pinLoginSchema / pinChangeSchema", () => {
  it("pin fields must be exactly four digits", () => {
    expect(
      pinSetupSchema.safeParse({ phone: "01711000001", pin: "7391", confirmPin: "7391" }).success,
    ).toBe(true);
    expect(
      pinSetupSchema.safeParse({ phone: "01711000001", pin: "739", confirmPin: "739" }).success,
    ).toBe(false);
  });

  it("pinLoginSchema requires phone and a four-digit pin", () => {
    expect(pinLoginSchema.safeParse({ phone: "01711000001", pin: "7391" }).success).toBe(true);
    expect(pinLoginSchema.safeParse({ phone: "01711000001", pin: "73911" }).success).toBe(false);
  });

  it("pinChangeSchema does not require a phone (resolved server-side from the session)", () => {
    expect(pinChangeSchema.safeParse({ newPin: "5124", confirmNewPin: "5124" }).success).toBe(true);
  });
});
