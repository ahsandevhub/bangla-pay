import { z } from "zod";

const SUPPORTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export const kycUploadUrlSchema = z.object({
  fileExtension: z.enum(SUPPORTED_IMAGE_EXTENSIONS),
});

export type KycUploadUrlInput = z.infer<typeof kycUploadUrlSchema>;

// NID number: digits only after normalization (dashes/spaces stripped
// client-side before this schema sees it); real Bangladeshi NIDs are 10, 13,
// or 17 digits -- docs/CONTRACTS.md's fixtures use the 17-digit form.
const nidNumberSchema = z.string().regex(/^\d{10}$|^\d{13}$|^\d{17}$/, "Enter a valid NID number.");

export const kycVerifySchema = z
  .object({
    documentPath: z.string().min(1),
    nidNumber: nidNumberSchema,
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth."),
    banglaName: z.string().trim().min(1).optional(),
    englishName: z.string().trim().min(1).optional(),
  })
  // "A match requires exact normalized NID number and date of birth plus at
  // least one exact normalized name" (docs/ARCHITECTURE.md) -- both names
  // are individually optional, but at least one must be present.
  .refine((data) => data.banglaName || data.englishName, {
    message: "Provide at least one of the Bangla or English name.",
    path: ["englishName"],
  });

export type KycVerifyInput = z.infer<typeof kycVerifySchema>;
