import { describe, expect, it } from "vitest";
import { kycUploadUrlSchema, kycVerifySchema } from "@/lib/kyc/kyc.schema";

describe("kycUploadUrlSchema", () => {
  it.each(["jpg", "jpeg", "png", "webp"])("accepts a supported extension (%s)", (fileExtension) => {
    expect(kycUploadUrlSchema.safeParse({ fileExtension }).success).toBe(true);
  });

  it.each(["gif", "bmp", "pdf", "exe", ""])("rejects an unsupported extension (%s)", (fileExtension) => {
    expect(kycUploadUrlSchema.safeParse({ fileExtension }).success).toBe(false);
  });
});

describe("kycVerifySchema", () => {
  const base = {
    documentPath: "user-1/nid-front.jpg",
    nidNumber: "19920115123456701",
    dateOfBirth: "1992-01-15",
  };

  it("accepts a submission with only an English name", () => {
    expect(kycVerifySchema.safeParse({ ...base, englishName: "Ahsan Habib" }).success).toBe(true);
  });

  it("accepts a submission with only a Bangla name", () => {
    expect(kycVerifySchema.safeParse({ ...base, banglaName: "আহসান হাবিব" }).success).toBe(true);
  });

  it("accepts a submission with both names", () => {
    expect(
      kycVerifySchema.safeParse({ ...base, banglaName: "আহসান হাবিব", englishName: "Ahsan Habib" }).success,
    ).toBe(true);
  });

  it("rejects a submission with neither name", () => {
    expect(kycVerifySchema.safeParse(base).success).toBe(false);
  });

  it.each(["1234567890", "1234567890123", "19920115123456701"])(
    "accepts valid NID lengths (10, 13, 17 digits) (%s)",
    (nidNumber) => {
      expect(kycVerifySchema.safeParse({ ...base, nidNumber, englishName: "Test" }).success).toBe(true);
    },
  );

  it.each(["123", "abcdefghij", "199201151234567012"])("rejects an invalid NID number (%s)", (nidNumber) => {
    expect(kycVerifySchema.safeParse({ ...base, nidNumber, englishName: "Test" }).success).toBe(false);
  });

  it("rejects a malformed date of birth", () => {
    expect(
      kycVerifySchema.safeParse({ ...base, dateOfBirth: "15-01-1992", englishName: "Test" }).success,
    ).toBe(false);
  });

  it("rejects an empty documentPath", () => {
    expect(
      kycVerifySchema.safeParse({ ...base, documentPath: "", englishName: "Test" }).success,
    ).toBe(false);
  });
});
