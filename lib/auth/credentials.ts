import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";

// All HMAC derivations below use domain-separated inputs (a fixed prefix
// distinct per use case) so the *same* pepper can never let one derived
// value be reinterpreted as another -- a leaked pin_history fingerprint,
// for instance, is not the account's password credential.
function hmacSha256Hex(domain: string, input: string): string {
  const pepper = process.env.APP_SECURITY_PEPPER;
  if (!pepper) {
    throw new Error("APP_SECURITY_PEPPER is not configured");
  }
  return createHmac("sha256", pepper).update(`${domain}:${input}`).digest("hex");
}

/** The internal Supabase Auth password for phone/password sign-in -- never the raw PIN. */
export function derivePasswordCredential(canonicalPhone: string, pin: string): string {
  return hmacSha256Hex("auth", `${canonicalPhone}:${pin}`);
}

/** Stored in pin_history to detect reuse of the current/previous two PINs -- never the login credential. */
export function derivePinFingerprint(canonicalPhone: string, pin: string): string {
  return hmacSha256Hex("pin-history", `${canonicalPhone}:${pin}`);
}

/** A fresh 32-byte trusted-device token. Only its hash (below) is ever persisted. */
export function generateDeviceToken(): string {
  return randomBytes(32).toString("hex");
}

/** Matches the Postgres side's `encode(extensions.digest(token, 'sha256'), 'hex')`. */
export function hashDeviceToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
