import { describe, expect, it } from "vitest";
import { WeakPinError, assertPinIsStrong } from "@/lib/auth/pin";

const PHONE = "+8801711009999";

describe("assertPinIsStrong", () => {
  it("accepts a genuinely random-looking PIN", () => {
    expect(() => assertPinIsStrong("7391", PHONE)).not.toThrow();
  });

  it.each(["12345", "123", "abcd", "12a4"])("rejects a malformed PIN (%s)", (pin) => {
    expect(() => assertPinIsStrong(pin, PHONE)).toThrow(WeakPinError);
  });

  it.each(["0000", "1111", "9999"])("rejects repeated digits (%s)", (pin) => {
    expect(() => assertPinIsStrong(pin, PHONE)).toThrow(WeakPinError);
  });

  it.each(["1234", "2345", "6789", "4321", "9876", "5432"])(
    "rejects a sequential run (%s)",
    (pin) => {
      expect(() => assertPinIsStrong(pin, PHONE)).toThrow(WeakPinError);
    },
  );

  it.each(["2580", "0852"])("rejects the well-known clock patterns (%s)", (pin) => {
    expect(() => assertPinIsStrong(pin, PHONE)).toThrow(WeakPinError);
  });

  it("rejects the phone number's own last four digits", () => {
    expect(() => assertPinIsStrong("9999", "+8801711009999")).toThrow(WeakPinError);
  });

  it("accepts a PIN that merely resembles but doesn't match the phone's last four digits", () => {
    expect(() => assertPinIsStrong("9998", "+8801711009999")).not.toThrow();
  });
});
