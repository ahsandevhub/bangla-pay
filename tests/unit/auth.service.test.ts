import { beforeAll, describe, expect, it, vi } from "vitest";
import { AuthService } from "@/lib/auth/auth.service";
import type { AuthRepository } from "@/lib/auth/auth.repository";
import { ok, err } from "@/lib/shared/result";
import { appError } from "@/lib/shared/errors/app-error";

beforeAll(() => {
  process.env.APP_SECURITY_PEPPER = "test-pepper-not-a-real-secret";
});

class FakeAuthRepository implements AuthRepository {
  getOwnPhone = vi.fn<AuthRepository["getOwnPhone"]>();
  isPhoneRegistered = vi.fn<AuthRepository["isPhoneRegistered"]>();
  sendOtp = vi.fn<AuthRepository["sendOtp"]>();
  readDemoSms = vi.fn<AuthRepository["readDemoSms"]>();
  verifyOtp = vi.fn<AuthRepository["verifyOtp"]>();
  createAuthUser = vi.fn<AuthRepository["createAuthUser"]>();
  signInWithPassword = vi.fn<AuthRepository["signInWithPassword"]>();
  signOutOtherSessions = vi.fn<AuthRepository["signOutOtherSessions"]>();
  updatePassword = vi.fn<AuthRepository["updatePassword"]>();
  completeRegistration = vi.fn<AuthRepository["completeRegistration"]>();
  assertDeviceTrustedForLogin = vi.fn<AuthRepository["assertDeviceTrustedForLogin"]>();
  assertNewDeviceLoginAllowed = vi.fn<AuthRepository["assertNewDeviceLoginAllowed"]>();
  assertNotPinLocked = vi.fn<AuthRepository["assertNotPinLocked"]>();
  recordPinFailure = vi.fn<AuthRepository["recordPinFailure"]>();
  recordPinSuccess = vi.fn<AuthRepository["recordPinSuccess"]>();
  refreshActiveSession = vi.fn<AuthRepository["refreshActiveSession"]>();
  rotateDeviceSession = vi.fn<AuthRepository["rotateDeviceSession"]>();
  assertPinNotReused = vi.fn<AuthRepository["assertPinNotReused"]>();
  recordPinChange = vi.fn<AuthRepository["recordPinChange"]>();
}

function passingRepo(): FakeAuthRepository {
  const repo = new FakeAuthRepository();
  repo.getOwnPhone.mockResolvedValue(ok("+8801711000001"));
  repo.isPhoneRegistered.mockResolvedValue(ok(false));
  repo.sendOtp.mockResolvedValue(ok("inbox-token"));
  repo.readDemoSms.mockResolvedValue(ok(null));
  repo.verifyOtp.mockResolvedValue(ok(undefined));
  repo.createAuthUser.mockResolvedValue(ok("user-1"));
  repo.signInWithPassword.mockResolvedValue(ok(undefined));
  repo.signOutOtherSessions.mockResolvedValue(ok(undefined));
  repo.updatePassword.mockResolvedValue(ok(undefined));
  repo.completeRegistration.mockResolvedValue(ok(undefined));
  repo.assertDeviceTrustedForLogin.mockResolvedValue(ok(undefined));
  repo.assertNewDeviceLoginAllowed.mockResolvedValue(ok(undefined));
  repo.assertNotPinLocked.mockResolvedValue(ok(undefined));
  repo.recordPinFailure.mockResolvedValue(ok(undefined));
  repo.recordPinSuccess.mockResolvedValue(ok(undefined));
  repo.refreshActiveSession.mockResolvedValue(ok(undefined));
  repo.rotateDeviceSession.mockResolvedValue(ok(undefined));
  repo.assertPinNotReused.mockResolvedValue(ok(undefined));
  repo.recordPinChange.mockResolvedValue(ok(undefined));
  return repo;
}

describe("AuthService.register", () => {
  it("rejects mismatched PIN confirmation without calling the repository", async () => {
    const repo = passingRepo();
    const service = new AuthService(repo);

    const result = await service.register({
      phone: "01711000001",
      pin: "7391",
      confirmPin: "1111",
      userAgent: "test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PIN_MISMATCH");
    expect(repo.createAuthUser).not.toHaveBeenCalled();
  });

  it("rejects a weak PIN without calling the repository", async () => {
    const repo = passingRepo();
    const service = new AuthService(repo);

    const result = await service.register({
      phone: "01711000001",
      pin: "1234",
      confirmPin: "1234",
      userAgent: "test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PIN_WEAK");
    expect(repo.createAuthUser).not.toHaveBeenCalled();
  });

  it("creates the user, signs in, and completes registration in order on the happy path", async () => {
    const repo = passingRepo();
    const service = new AuthService(repo);

    const result = await service.register({
      phone: "01711000001",
      pin: "7391",
      confirmPin: "7391",
      userAgent: "test-agent",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.deviceToken).toMatch(/^[0-9a-f]{64}$/);
    expect(repo.createAuthUser).toHaveBeenCalledWith("+8801711000001", expect.any(String));
    expect(repo.signInWithPassword).toHaveBeenCalledWith("+8801711000001", expect.any(String));
    expect(repo.completeRegistration).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+8801711000001", userAgent: "test-agent" }),
    );
  });

  it("stops before signing in if user creation fails", async () => {
    const repo = passingRepo();
    repo.createAuthUser.mockResolvedValue(err(appError("PHONE_ALREADY_REGISTERED", "taken")));
    const service = new AuthService(repo);

    const result = await service.register({
      phone: "01711000001",
      pin: "7391",
      confirmPin: "7391",
      userAgent: "test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PHONE_ALREADY_REGISTERED");
    expect(repo.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("AuthService.login", () => {
  it("uses the trusted-device fast path when the device matches, without checking OTP proof", async () => {
    const repo = passingRepo();
    const service = new AuthService(repo);

    const result = await service.login({
      phone: "01711000001",
      pin: "7391",
      deviceToken: "some-raw-token",
      userAgent: "test",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.deviceToken).toBeNull();
    expect(repo.assertNewDeviceLoginAllowed).not.toHaveBeenCalled();
    expect(repo.rotateDeviceSession).not.toHaveBeenCalled();
    expect(repo.recordPinSuccess).toHaveBeenCalledWith("+8801711000001");
    // Regression: signInWithPassword always issues a brand-new session, even
    // on an already-trusted device -- without refreshing active_session_id
    // to match, every RLS check for the rest of this session would
    // incorrectly read as inactive (found via a real end-to-end login ->
    // GET /api/accounts/me probe returning ACCOUNT_NOT_FOUND for an account
    // that plainly existed).
    expect(repo.refreshActiveSession).toHaveBeenCalled();
  });

  it("fails the trusted-device login if refreshing the session pointer fails", async () => {
    const repo = passingRepo();
    repo.refreshActiveSession.mockResolvedValue(err(appError("INTERNAL_ERROR", "boom")));
    const service = new AuthService(repo);

    const result = await service.login({
      phone: "01711000001",
      pin: "7391",
      deviceToken: "some-raw-token",
      userAgent: "test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INTERNAL_ERROR");
  });

  it("falls back to the new-device (OTP-gated) path on DEVICE_UNTRUSTED", async () => {
    const repo = passingRepo();
    repo.assertDeviceTrustedForLogin.mockResolvedValue(err(appError("DEVICE_UNTRUSTED", "untrusted")));
    const service = new AuthService(repo);

    const result = await service.login({
      phone: "01711000001",
      pin: "7391",
      deviceToken: null,
      userAgent: "test",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.deviceToken).toMatch(/^[0-9a-f]{64}$/);
    expect(repo.assertNewDeviceLoginAllowed).toHaveBeenCalledWith("+8801711000001");
    expect(repo.rotateDeviceSession).toHaveBeenCalled();
    expect(repo.signOutOtherSessions).toHaveBeenCalled();
  });

  it("does NOT fall back when the trusted-device check fails with PIN_LOCKED", async () => {
    const repo = passingRepo();
    repo.assertDeviceTrustedForLogin.mockResolvedValue(err(appError("PIN_LOCKED", "locked")));
    const service = new AuthService(repo);

    const result = await service.login({
      phone: "01711000001",
      pin: "7391",
      deviceToken: "some-raw-token",
      userAgent: "test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PIN_LOCKED");
    expect(repo.assertNewDeviceLoginAllowed).not.toHaveBeenCalled();
  });

  it("records a PIN failure and does not rotate the device on a failed sign-in attempt", async () => {
    const repo = passingRepo();
    repo.signInWithPassword.mockResolvedValue(err(appError("PIN_INVALID", "wrong")));
    const service = new AuthService(repo);

    const result = await service.login({
      phone: "01711000001",
      pin: "0000",
      deviceToken: "some-raw-token",
      userAgent: "test",
    });

    expect(result.ok).toBe(false);
    expect(repo.recordPinFailure).toHaveBeenCalledWith("+8801711000001");
    expect(repo.recordPinSuccess).not.toHaveBeenCalled();
    expect(repo.rotateDeviceSession).not.toHaveBeenCalled();
  });
});

describe("AuthService.changePin", () => {
  it("resolves phone from the session, ignoring any client-supplied value", async () => {
    const repo = passingRepo();
    const service = new AuthService(repo);

    await service.changePin({ newPin: "5124", confirmNewPin: "5124" });

    expect(repo.getOwnPhone).toHaveBeenCalled();
    expect(repo.recordPinChange).toHaveBeenCalledWith("+8801711000001", expect.any(String));
  });

  it("rejects mismatched confirmation without checking reuse or touching the password", async () => {
    const repo = passingRepo();
    const service = new AuthService(repo);

    const result = await service.changePin({ newPin: "5124", confirmNewPin: "1111" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PIN_MISMATCH");
    expect(repo.assertPinNotReused).not.toHaveBeenCalled();
    expect(repo.updatePassword).not.toHaveBeenCalled();
  });

  it("checks reuse before updating the password, and records the change only after both succeed", async () => {
    const repo = passingRepo();
    const service = new AuthService(repo);
    const calls: string[] = [];
    repo.assertPinNotReused.mockImplementation(async () => {
      calls.push("assertPinNotReused");
      return ok(undefined);
    });
    repo.updatePassword.mockImplementation(async () => {
      calls.push("updatePassword");
      return ok(undefined);
    });
    repo.recordPinChange.mockImplementation(async () => {
      calls.push("recordPinChange");
      return ok(undefined);
    });

    const result = await service.changePin({ newPin: "5124", confirmNewPin: "5124" });

    expect(result.ok).toBe(true);
    expect(calls).toEqual(["assertPinNotReused", "updatePassword", "recordPinChange"]);
  });

  it("does not update the password or record a change when reuse is rejected", async () => {
    const repo = passingRepo();
    repo.assertPinNotReused.mockResolvedValue(err(appError("PIN_REUSED", "reused")));
    const service = new AuthService(repo);

    const result = await service.changePin({ newPin: "5124", confirmNewPin: "5124" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PIN_REUSED");
    expect(repo.updatePassword).not.toHaveBeenCalled();
    expect(repo.recordPinChange).not.toHaveBeenCalled();
  });
});

describe("AuthService OTP passthroughs", () => {
  it("sendOtp for PIN_CHANGE ignores the client-supplied phone", async () => {
    const repo = passingRepo();
    const service = new AuthService(repo);

    await service.sendOtp("01999999999", "PIN_CHANGE");

    expect(repo.getOwnPhone).toHaveBeenCalled();
    expect(repo.sendOtp).toHaveBeenCalledWith("+8801711000001", "PIN_CHANGE");
  });

  it("sendOtp for REGISTRATION uses the client-supplied phone (no session exists yet)", async () => {
    const repo = passingRepo();
    const service = new AuthService(repo);

    await service.sendOtp("01711000001", "REGISTRATION");

    expect(repo.getOwnPhone).not.toHaveBeenCalled();
    expect(repo.sendOtp).toHaveBeenCalledWith("+8801711000001", "REGISTRATION");
  });
});
