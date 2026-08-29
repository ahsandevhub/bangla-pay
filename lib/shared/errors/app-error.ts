// Frozen error codes from docs/CONTRACTS.md (Phase 0). Only the shared HTTP
// handler (lib/shared/http/handler.ts) maps these to HTTP status codes and
// public messages -- every other layer just produces/passes an AppError.
export const APP_ERROR_CODES = [
  // Cross-cutting
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  // POST /api/auth/phone/check
  "PHONE_INVALID",
  "PHONE_ALREADY_REGISTERED",
  // POST /api/auth/otp/send
  "OTP_RESEND_TOO_SOON",
  // POST /api/auth/otp/verify
  "OTP_INVALID",
  "OTP_EXPIRED",
  "OTP_ALREADY_CONSUMED",
  "OTP_ATTEMPTS_EXCEEDED",
  // POST /api/auth/pin/setup
  "PIN_WEAK",
  "PIN_MISMATCH",
  // POST /api/auth/pin/login
  "PIN_INVALID",
  "PIN_LOCKED",
  "DEVICE_UNTRUSTED",
  // POST /api/auth/pin/change
  "OTP_REQUIRED",
  "PIN_REUSED",
  // POST /api/kyc/upload-url
  "FILE_TYPE_INVALID",
  "ACCOUNT_ALREADY_VERIFIED",
  // POST /api/kyc/verify
  "KYC_FIELDS_INVALID",
  "KYC_NO_MATCH",
  "NID_ALREADY_USED",
  "KYC_ATTEMPTS_EXCEEDED",
  // transfer_money (shared by /api/transfers and /api/requests/[id]/accept)
  "INVALID_AMOUNT",
  "ACCOUNT_NOT_FOUND",
  "ACCOUNT_INACTIVE",
  "SELF_TRANSFER",
  "INSUFFICIENT_FUNDS",
  "UNVERIFIED_DEVICE",
  "INACTIVE_SESSION",
  "DEVICE_REPLACED",
  // POST /api/requests/[id]/accept, /decline
  "REQUEST_NOT_FOUND",
  "REQUEST_NOT_PENDING",
  "REQUEST_UNAUTHORIZED",
  "REQUEST_EXPIRED",
  // GET /api/transactions
  "CURSOR_INVALID",
  // GET /api/admin/reconcile
  "UNAUTHORIZED",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export type AppError = {
  code: AppErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export function appError(
  code: AppErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): AppError {
  return fieldErrors ? { code, message, fieldErrors } : { code, message };
}

export function isAppErrorCode(value: string): value is AppErrorCode {
  return (APP_ERROR_CODES as readonly string[]).includes(value);
}

const HTTP_STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  PHONE_INVALID: 400,
  PHONE_ALREADY_REGISTERED: 409,
  OTP_RESEND_TOO_SOON: 429,
  OTP_INVALID: 400,
  OTP_EXPIRED: 400,
  OTP_ALREADY_CONSUMED: 400,
  OTP_ATTEMPTS_EXCEEDED: 429,
  PIN_WEAK: 400,
  PIN_MISMATCH: 400,
  PIN_INVALID: 401,
  PIN_LOCKED: 423,
  DEVICE_UNTRUSTED: 401,
  OTP_REQUIRED: 401,
  PIN_REUSED: 400,
  FILE_TYPE_INVALID: 400,
  ACCOUNT_ALREADY_VERIFIED: 409,
  KYC_FIELDS_INVALID: 400,
  KYC_NO_MATCH: 422,
  NID_ALREADY_USED: 409,
  KYC_ATTEMPTS_EXCEEDED: 429,
  INVALID_AMOUNT: 400,
  ACCOUNT_NOT_FOUND: 404,
  ACCOUNT_INACTIVE: 409,
  SELF_TRANSFER: 400,
  INSUFFICIENT_FUNDS: 422,
  UNVERIFIED_DEVICE: 401,
  INACTIVE_SESSION: 401,
  DEVICE_REPLACED: 401,
  REQUEST_NOT_FOUND: 404,
  REQUEST_NOT_PENDING: 409,
  REQUEST_UNAUTHORIZED: 403,
  REQUEST_EXPIRED: 409,
  CURSOR_INVALID: 400,
  UNAUTHORIZED: 401,
};

export function httpStatusForErrorCode(code: AppErrorCode): number {
  return HTTP_STATUS_BY_CODE[code];
}

// English fallback copy, keyed by code. The UI is Bangla-first and expected
// to translate by `code` itself; this exists for API consumers, logs, and
// any surface that renders `message` directly without its own i18n lookup.
const DEFAULT_MESSAGE_BY_CODE: Record<AppErrorCode, string> = {
  VALIDATION_ERROR: "The submitted data is invalid.",
  UNAUTHENTICATED: "Sign in required.",
  RATE_LIMITED: "Too many attempts. Please wait and try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
  PHONE_INVALID: "Enter a valid Bangladeshi mobile number.",
  PHONE_ALREADY_REGISTERED: "This phone number is already registered.",
  OTP_RESEND_TOO_SOON: "Please wait before requesting another code.",
  OTP_INVALID: "That code is incorrect.",
  OTP_EXPIRED: "That code has expired. Request a new one.",
  OTP_ALREADY_CONSUMED: "That code has already been used.",
  OTP_ATTEMPTS_EXCEEDED: "Too many incorrect attempts. Request a new code.",
  PIN_WEAK: "Choose a less predictable PIN.",
  PIN_MISMATCH: "PINs do not match.",
  PIN_INVALID: "Incorrect PIN.",
  PIN_LOCKED: "Too many incorrect PIN attempts. Try again later.",
  DEVICE_UNTRUSTED: "Verify this device with a one-time code first.",
  OTP_REQUIRED: "Verify with a one-time code first.",
  PIN_REUSED: "Choose a PIN you haven't used recently.",
  FILE_TYPE_INVALID: "Upload a supported image file.",
  ACCOUNT_ALREADY_VERIFIED: "This account is already verified.",
  KYC_FIELDS_INVALID: "Check the submitted details and try again.",
  KYC_NO_MATCH: "We couldn't verify these details.",
  NID_ALREADY_USED: "This NID is already linked to another account.",
  KYC_ATTEMPTS_EXCEEDED: "Too many verification attempts. Try again later.",
  INVALID_AMOUNT: "Enter a valid amount.",
  ACCOUNT_NOT_FOUND: "Account not found.",
  ACCOUNT_INACTIVE: "This account cannot receive or send money right now.",
  SELF_TRANSFER: "You can't send money to yourself.",
  INSUFFICIENT_FUNDS: "Insufficient balance.",
  UNVERIFIED_DEVICE: "This device isn't verified.",
  INACTIVE_SESSION: "Your session is no longer active. Please sign in again.",
  DEVICE_REPLACED: "This device has been signed out because another device was verified.",
  REQUEST_NOT_FOUND: "Request not found.",
  REQUEST_NOT_PENDING: "This request has already been settled.",
  REQUEST_UNAUTHORIZED: "You're not authorized to act on this request.",
  REQUEST_EXPIRED: "This request has expired.",
  CURSOR_INVALID: "Could not load more history.",
  UNAUTHORIZED: "Not authorized.",
};

export function defaultMessageForErrorCode(code: AppErrorCode): string {
  return DEFAULT_MESSAGE_BY_CODE[code];
}
