import { describe, expect, it } from "vitest";
import { InvalidPhoneError, normalizePhone } from "@/lib/auth/phone";

describe("normalizePhone", () => {
  it.each(["01711000001", "01311000001", "01911000001"])(
    "normalizes a local-form number (%s) to canonical +8801...",
    (input) => {
      expect(normalizePhone(input)).toBe(`+88${input}`);
    },
  );

  it.each(["+8801711000001", "+8801311000001"])(
    "accepts an already-canonical number (%s) unchanged",
    (input) => {
      expect(normalizePhone(input)).toBe(input);
    },
  );

  it("normalizes equivalent local and canonical forms to the same value", () => {
    expect(normalizePhone("01711000001")).toBe(normalizePhone("+8801711000001"));
  });

  it("trims surrounding whitespace", () => {
    expect(normalizePhone("  01711000001  ")).toBe("+8801711000001");
  });

  it.each([
    "01011000001", // second digit not in [3-9]
    "0171100000", // too short
    "017110000011", // too long
    "+880171100000", // too short canonical
    "+88017110000011", // too long canonical
    "8801711000001", // missing +
    "not-a-phone",
    "",
  ])("rejects an invalid number (%s)", (input) => {
    expect(() => normalizePhone(input)).toThrow(InvalidPhoneError);
  });
});
