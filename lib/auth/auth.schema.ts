import { z } from "zod";

// Route boundary accepts either local (01...) or canonical (+8801...) shape;
// normalizePhone() in the service layer does the actual normalization and
// rejects anything neither form matches.
const PHONE_INPUT_PATTERN = /^(?:\+8801[3-9]\d{8}|01[3-9]\d{8})$/;

export const phoneCheckSchema = z.object({
  phone: z.string().regex(PHONE_INPUT_PATTERN, "Enter a valid Bangladeshi mobile number."),
});

export const otpPurposeSchema = z.enum(["REGISTRATION", "DEVICE_LOGIN", "PIN_CHANGE"]);

export const otpSendSchema = z.object({
  phone: z.string().regex(PHONE_INPUT_PATTERN, "Enter a valid Bangladeshi mobile number."),
  purpose: otpPurposeSchema,
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(PHONE_INPUT_PATTERN, "Enter a valid Bangladeshi mobile number."),
  purpose: otpPurposeSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the six-digit code."),
});

export const demoSmsQuerySchema = z.object({
  inboxToken: z.string().uuid(),
});

const pinFieldSchema = z.string().regex(/^\d{4}$/, "Enter a four-digit PIN.");

export const pinSetupSchema = z.object({
  phone: z.string().regex(PHONE_INPUT_PATTERN, "Enter a valid Bangladeshi mobile number."),
  pin: pinFieldSchema,
  confirmPin: pinFieldSchema,
});

export const pinLoginSchema = z.object({
  phone: z.string().regex(PHONE_INPUT_PATTERN, "Enter a valid Bangladeshi mobile number."),
  pin: pinFieldSchema,
});

export const pinChangeSchema = z.object({
  newPin: pinFieldSchema,
  confirmNewPin: pinFieldSchema,
});
