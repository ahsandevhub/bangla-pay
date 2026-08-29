import { beforeAll, describe, expect, it } from "vitest";

describe("credential derivation", () => {
  beforeAll(() => {
    process.env.APP_SECURITY_PEPPER = "test-pepper-not-a-real-secret";
  });

  it("derives a deterministic password credential for the same phone+PIN", async () => {
    const { derivePasswordCredential } = await import("@/lib/auth/credentials");
    const a = derivePasswordCredential("+8801711000001", "7391");
    const b = derivePasswordCredential("+8801711000001", "7391");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("derives different credentials for different phones with the same PIN", async () => {
    const { derivePasswordCredential } = await import("@/lib/auth/credentials");
    const a = derivePasswordCredential("+8801711000001", "7391");
    const b = derivePasswordCredential("+8801811000002", "7391");
    expect(a).not.toBe(b);
  });

  it("derives different credentials for different PINs with the same phone", async () => {
    const { derivePasswordCredential } = await import("@/lib/auth/credentials");
    const a = derivePasswordCredential("+8801711000001", "7391");
    const b = derivePasswordCredential("+8801711000001", "1234");
    expect(a).not.toBe(b);
  });

  it("derives a PIN fingerprint distinct from the password credential (domain separation)", async () => {
    const { derivePasswordCredential, derivePinFingerprint } = await import("@/lib/auth/credentials");
    const credential = derivePasswordCredential("+8801711000001", "7391");
    const fingerprint = derivePinFingerprint("+8801711000001", "7391");
    expect(fingerprint).not.toBe(credential);
  });

  it("generates a distinct device token each call", async () => {
    const { generateDeviceToken } = await import("@/lib/auth/credentials");
    const a = generateDeviceToken();
    const b = generateDeviceToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashDeviceToken is deterministic and matches Postgres's sha256(token) hex encoding", async () => {
    const { hashDeviceToken } = await import("@/lib/auth/credentials");
    // Known SHA-256("hello") value, independent of this codebase.
    expect(hashDeviceToken("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
