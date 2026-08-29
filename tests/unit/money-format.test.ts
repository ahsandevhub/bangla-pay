import { describe, expect, it } from "vitest";
import { formatPoishaAsBdt, formatNumber, toLocaleDigits } from "@/lib/shared/format/money";

describe("formatPoishaAsBdt", () => {
  it("formats a whole-taka amount in English", () => {
    expect(formatPoishaAsBdt("10000000", "en")).toBe("৳100,000.00");
  });

  it("formats the same amount with Bangla numerals, including the fraction", () => {
    // Regression: the fraction used to stay ASCII ("00") in Bangla locale --
    // see docs history / components/kyc/kyc-flow.tsx's original bug.
    expect(formatPoishaAsBdt("10000000", "bn")).toBe("৳১,০০,০০০.০০");
  });

  it("formats a non-zero fraction", () => {
    expect(formatPoishaAsBdt("250050", "en")).toBe("৳2,500.50");
    expect(formatPoishaAsBdt("250050", "bn")).toBe("৳২,৫০০.৫০");
  });

  it("formats a negative amount (e.g. the system account) with a leading minus", () => {
    expect(formatPoishaAsBdt("-500", "en")).toBe("-৳5.00");
  });

  it("formats zero", () => {
    expect(formatPoishaAsBdt("0", "en")).toBe("৳0.00");
  });
});

describe("toLocaleDigits", () => {
  it("leaves ASCII digits alone in English", () => {
    expect(toLocaleDigits("00", "en")).toBe("00");
  });

  it("converts ASCII digits to Bangla numerals", () => {
    expect(toLocaleDigits("00", "bn")).toBe("০০");
  });
});

describe("formatNumber", () => {
  it("uses en-US grouping in English", () => {
    expect(formatNumber(100000, "en")).toBe("100,000");
  });

  it("uses bn-BD grouping and numerals in Bangla", () => {
    expect(formatNumber(100000, "bn")).toBe("১,০০,০০০");
  });
});
