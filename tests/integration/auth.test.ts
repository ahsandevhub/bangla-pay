import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { pool, randomPhone, registerPendingKycUser, sha256Hex, withAuthenticatedSession } from "./db";

// Phase 4: OTP lifecycle, registration, device-trust preconditions, PIN
// lockout, and PIN change -- the PL/pgSQL functions lib/auth's repository
// calls. Does not cover the Supabase Auth (GoTrue) half of the flow
// (admin.createUser / signInWithPassword) -- that was verified end-to-end
// against a live dev server (see the phase's commit message); these tests
// cover the Postgres-side functions those calls sit on top of.

const cleanups: Array<() => Promise<void>> = [];

afterAll(async () => {
  await Promise.all(cleanups.map((cleanup) => cleanup()));
});

const registerUser = registerPendingKycUser;

function cleanupUser(userId: string) {
  cleanups.push(async () => {
    await pool.query("delete from auth.users where id = $1", [userId]);
  });
}

/**
 * verify_otp returns a result row rather than raising (see the comment on
 * that function in the migration) -- these assert against `verified`/
 * `failure_code` instead of an exception.
 */
async function expectVerifyOtp(
  phone: string,
  purpose: string,
  code: string,
  expected: { verified: boolean; failureCode?: string },
) {
  const result = await pool.query(
    "select verified, failure_code from public.verify_otp($1, $2::public.otp_purpose, $3)",
    [phone, purpose, code],
  );
  expect(result.rows[0].verified).toBe(expected.verified);
  if (expected.failureCode) {
    expect(result.rows[0].failure_code).toBe(expected.failureCode);
  }
}

describe("OTP lifecycle", () => {
  it("sends, reads, and verifies a code; the demo inbox is emptied on verification", async () => {
    const phone = randomPhone("71");
    const send = await pool.query("select public.request_otp($1, 'REGISTRATION') as inbox_token", [phone]);
    const inboxToken = send.rows[0].inbox_token;

    const sms = await pool.query("select code, purpose from public.read_demo_sms($1)", [inboxToken]);
    expect(sms.rows).toHaveLength(1);
    expect(sms.rows[0].purpose).toBe("REGISTRATION");
    const code = sms.rows[0].code;

    await expectVerifyOtp(phone, "REGISTRATION", code, { verified: true });

    const smsAfter = await pool.query("select code from public.read_demo_sms($1)", [inboxToken]);
    expect(smsAfter.rows).toHaveLength(0);
  });

  it("rejects a wrong code", async () => {
    const phone = randomPhone("72");
    await pool.query("select public.request_otp($1, 'REGISTRATION')", [phone]);
    await expectVerifyOtp(phone, "REGISTRATION", "000000", {
      verified: false,
      failureCode: "OTP_INVALID",
    });
  });

  it("rejects verifying an already-consumed code", async () => {
    const phone = randomPhone("73");
    const send = await pool.query("select public.request_otp($1, 'REGISTRATION') as inbox_token", [phone]);
    const sms = await pool.query("select code from public.read_demo_sms($1)", [send.rows[0].inbox_token]);
    const code = sms.rows[0].code;
    await expectVerifyOtp(phone, "REGISTRATION", code, { verified: true });

    await expectVerifyOtp(phone, "REGISTRATION", code, {
      verified: false,
      failureCode: "OTP_ALREADY_CONSUMED",
    });
  });

  it("rejects an expired code", async () => {
    const phone = randomPhone("74");
    const send = await pool.query("select public.request_otp($1, 'REGISTRATION') as inbox_token", [phone]);
    const sms = await pool.query("select code from public.read_demo_sms($1)", [send.rows[0].inbox_token]);
    const code = sms.rows[0].code;

    await pool.query(
      "update public.otp_challenges set expires_at = now() - interval '1 second' where phone = $1",
      [phone],
    );

    await expectVerifyOtp(phone, "REGISTRATION", code, {
      verified: false,
      failureCode: "OTP_EXPIRED",
    });
  });

  it("locks out after five wrong attempts, and the attempt count actually persists", async () => {
    const phone = randomPhone("75");
    await pool.query("select public.request_otp($1, 'REGISTRATION')", [phone]);
    for (let i = 0; i < 5; i++) {
      await expectVerifyOtp(phone, "REGISTRATION", "000000", {
        verified: false,
        failureCode: "OTP_INVALID",
      });
    }
    const attempts = await pool.query("select attempts from public.otp_challenges where phone = $1", [phone]);
    expect(attempts.rows[0].attempts).toBe(5);

    await expectVerifyOtp(phone, "REGISTRATION", "000000", {
      verified: false,
      failureCode: "OTP_ATTEMPTS_EXCEEDED",
    });
  });

  it("enforces the 60-second resend throttle", async () => {
    const phone = randomPhone("76");
    await pool.query("select public.request_otp($1, 'REGISTRATION')", [phone]);
    await expect(pool.query("select public.request_otp($1, 'REGISTRATION')", [phone])).rejects.toThrow(
      /OTP_RESEND_TOO_SOON/,
    );
  });
});

describe("is_phone_registered", () => {
  it("reports false for an unregistered phone and true after registration", async () => {
    const phone = randomPhone("81");
    const before = await pool.query("select public.is_phone_registered($1) as registered", [phone]);
    expect(before.rows[0].registered).toBe(false);

    const user = await registerUser(phone);
    cleanupUser(user.userId);

    const after = await pool.query("select public.is_phone_registered($1) as registered", [phone]);
    expect(after.rows[0].registered).toBe(true);
  });
});

describe("complete_registration", () => {
  it("requires a recent verified REGISTRATION OTP", async () => {
    const userId = randomUUID();
    await pool.query("insert into auth.users (id, email) values ($1, $2)", [userId, `${userId}@test.local`]);
    cleanupUser(userId);

    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, session_id: randomUUID(), role: "authenticated" }),
      ]);
      await expect(
        client.query("select public.complete_registration($1, $2, $3, $4)", [
          randomPhone("82"),
          "fingerprint",
          "device-hash",
          "agent",
        ]),
      ).rejects.toThrow(/OTP_REQUIRED/);
      await client.query("rollback");
    } finally {
      client.release();
    }
  });

  it("sets up profile, security profile, trusted device, and PIN history", async () => {
    const phone = randomPhone("83");
    const user = await registerUser(phone);
    cleanupUser(user.userId);

    const profile = await pool.query("select status from public.profiles where id = $1", [user.userId]);
    expect(profile.rows[0].status).toBe("PENDING_KYC");

    const security = await pool.query(
      "select active_device_id is not null as has_device, active_session_id as session_id from public.security_profiles where user_id = $1",
      [user.userId],
    );
    expect(security.rows[0].has_device).toBe(true);
    expect(security.rows[0].session_id).toBe(user.sessionId);

    const devices = await pool.query("select count(*)::int as count from public.trusted_devices where user_id = $1", [
      user.userId,
    ]);
    expect(devices.rows[0].count).toBe(1);

    const pinHistory = await pool.query(
      "select count(*)::int as count from public.pin_history where user_id = $1",
      [user.userId],
    );
    expect(pinHistory.rows[0].count).toBe(1);
  });
});

describe("device trust and PIN lockout", () => {
  it("allows the trusted device and rejects a mismatched one", async () => {
    const phone = randomPhone("91");
    const user = await registerUser(phone);
    cleanupUser(user.userId);

    await expect(
      pool.query("select public.assert_device_trusted_for_login($1, $2)", [phone, sha256Hex(user.deviceToken)]),
    ).resolves.toBeDefined();

    await expect(
      pool.query("select public.assert_device_trusted_for_login($1, $2)", [phone, "wrong-hash"]),
    ).rejects.toThrow(/DEVICE_UNTRUSTED/);
  });

  it("does not raise for an unregistered phone (falls through to a natural sign-in failure)", async () => {
    await expect(
      pool.query("select public.assert_device_trusted_for_login($1, $2)", [randomPhone("92"), "any-hash"]),
    ).resolves.toBeDefined();
  });

  it("locks after five recorded failures and record_pin_success resets the counter", async () => {
    const phone = randomPhone("93");
    const user = await registerUser(phone);
    cleanupUser(user.userId);

    for (let i = 0; i < 5; i++) {
      await pool.query("select public.record_pin_failure($1)", [phone]);
    }

    const locked = await pool.query(
      "select pin_locked_until > now() as locked from public.security_profiles where user_id = $1",
      [user.userId],
    );
    expect(locked.rows[0].locked).toBe(true);

    await expect(
      pool.query("select public.assert_device_trusted_for_login($1, $2)", [phone, sha256Hex(user.deviceToken)]),
    ).rejects.toThrow(/PIN_LOCKED/);

    await pool.query("select public.record_pin_success($1)", [phone]);
    const reset = await pool.query(
      "select pin_failed_attempts, pin_locked_until from public.security_profiles where user_id = $1",
      [user.userId],
    );
    expect(reset.rows[0].pin_failed_attempts).toBe(0);
    expect(reset.rows[0].pin_locked_until).toBeNull();
  });

  it("assert_new_device_login_allowed requires a recent DEVICE_LOGIN OTP", async () => {
    const phone = randomPhone("94");
    const user = await registerUser(phone);
    cleanupUser(user.userId);

    await expect(
      pool.query("select public.assert_new_device_login_allowed($1)", [phone]),
    ).rejects.toThrow(/OTP_REQUIRED/);

    const send = await pool.query("select public.request_otp($1, 'DEVICE_LOGIN') as inbox_token", [phone]);
    const sms = await pool.query("select code from public.read_demo_sms($1)", [send.rows[0].inbox_token]);
    await pool.query("select public.verify_otp($1, 'DEVICE_LOGIN', $2)", [phone, sms.rows[0].code]);

    await expect(
      pool.query("select public.assert_new_device_login_allowed($1)", [phone]),
    ).resolves.toBeDefined();
  });

  it("rotate_device_session revokes the old device and trusts the new one", async () => {
    const phone = randomPhone("95");
    const user = await registerUser(phone);
    cleanupUser(user.userId);

    const newDeviceToken = `device-${randomUUID()}`;
    await withAuthenticatedSession(user, (client) =>
      client.query("select public.rotate_device_session($1, $2)", [sha256Hex(newDeviceToken), "new-agent"]),
    );

    const devices = await pool.query(
      "select token_hash, revoked_at is not null as revoked from public.trusted_devices where user_id = $1 order by created_at",
      [user.userId],
    );
    expect(devices.rows).toHaveLength(2);
    expect(devices.rows[0].revoked).toBe(true);
    expect(devices.rows[1].revoked).toBe(false);
    expect(devices.rows[1].token_hash).toBe(sha256Hex(newDeviceToken));

    await expect(
      pool.query("select public.assert_device_trusted_for_login($1, $2)", [phone, sha256Hex(user.deviceToken)]),
    ).rejects.toThrow(/DEVICE_UNTRUSTED/);
  });

  // Regression: a trusted-device PIN login calls signInWithPassword again,
  // which always issues a brand-new GoTrue session -- found by testing the
  // real login UI end-to-end and seeing GET /api/accounts/me come back
  // ACCOUNT_NOT_FOUND for an account that plainly existed, because RLS's
  // current_session_is_active() was still comparing against the *previous*
  // login's session_id. refresh_active_session() is what the trusted-device
  // path now calls to fix that pointer up.
  it("refresh_active_session moves active_session_id to a new session, restoring RLS access", async () => {
    const phone = randomPhone("96");
    const user = await registerUser(phone);
    cleanupUser(user.userId);

    // The "old" session (this account's own registration session) can read
    // its own profile right after registering.
    const beforeRead = await withAuthenticatedSession(user, (client) =>
      client.query("select id from public.profiles where id = $1", [user.userId]),
    );
    expect(beforeRead.rows).toHaveLength(1);

    // A second real login issues a brand-new session_id -- simulated here
    // exactly as it happens for real: same user, unrelated new session id.
    const newSessionId = randomUUID();
    await withAuthenticatedSession({ userId: user.userId, sessionId: newSessionId }, (client) =>
      client.query("select public.refresh_active_session()"),
    );

    const securityProfile = await pool.query(
      "select active_session_id from public.security_profiles where user_id = $1",
      [user.userId],
    );
    expect(securityProfile.rows[0].active_session_id).toBe(newSessionId);

    // current_session_is_active() -- what every financial-table RLS policy
    // and assert_active_session() actually gate on (profiles_select_own
    // itself only checks ownership, not session activity, so it can't tell
    // these two states apart) -- now accepts the new session...
    const afterActive = await withAuthenticatedSession(
      { userId: user.userId, sessionId: newSessionId },
      (client) => client.query("select public.current_session_is_active() as active"),
    );
    expect(afterActive.rows[0].active).toBe(true);

    // ...and correctly rejects the old session_id, which is exactly what a
    // real stale access token would still carry -- same as DEVICE_REPLACED
    // already proves for a rotated device.
    const staleActive = await withAuthenticatedSession(user, (client) =>
      client.query("select public.current_session_is_active() as active"),
    );
    expect(staleActive.rows[0].active).toBe(false);
  });
});

describe("PIN change", () => {
  it("rejects reuse of the current PIN's fingerprint", async () => {
    const phone = randomPhone("96");
    const user = await registerUser(phone);
    cleanupUser(user.userId);

    const currentFingerprint = await pool.query(
      "select pin_fingerprint from public.pin_history where user_id = $1",
      [user.userId],
    );

    await withAuthenticatedSession(user, (client) =>
      expect(
        client.query("select public.assert_pin_not_reused($1)", [currentFingerprint.rows[0].pin_fingerprint]),
      ).rejects.toThrow(/PIN_REUSED/),
    );
  });

  it("requires a recent verified PIN_CHANGE OTP before recording a change", async () => {
    const phone = randomPhone("97");
    const user = await registerUser(phone);
    cleanupUser(user.userId);

    await withAuthenticatedSession(user, (client) =>
      expect(
        client.query("select public.record_pin_change($1, $2)", [phone, "new-fingerprint"]),
      ).rejects.toThrow(/OTP_REQUIRED/),
    );

    const send = await pool.query("select public.request_otp($1, 'PIN_CHANGE') as inbox_token", [phone]);
    const sms = await pool.query("select code from public.read_demo_sms($1)", [send.rows[0].inbox_token]);
    await pool.query("select public.verify_otp($1, 'PIN_CHANGE', $2)", [phone, sms.rows[0].code]);

    await withAuthenticatedSession(user, (client) =>
      client.query("select public.record_pin_change($1, $2)", [phone, "new-fingerprint"]),
    );

    const history = await pool.query(
      "select pin_fingerprint from public.pin_history where user_id = $1 order by created_at",
      [user.userId],
    );
    expect(history.rows.map((row) => row.pin_fingerprint)).toContain("new-fingerprint");
  });

  it("keeps only the three most recent PIN fingerprints", async () => {
    const phone = randomPhone("98");
    const user = await registerUser(phone);
    cleanupUser(user.userId);

    for (let i = 0; i < 3; i++) {
      const send = await pool.query("select public.request_otp($1, 'PIN_CHANGE') as inbox_token", [phone]);
      const sms = await pool.query("select code from public.read_demo_sms($1)", [send.rows[0].inbox_token]);
      await pool.query("select public.verify_otp($1, 'PIN_CHANGE', $2)", [phone, sms.rows[0].code]);
      await withAuthenticatedSession(user, (client) =>
        client.query("select public.record_pin_change($1, $2)", [phone, `fingerprint-${i}`]),
      );
      // Stay clear of the 60s resend throttle across iterations.
      await pool.query("update public.otp_challenges set created_at = now() - interval '61 seconds' where phone = $1", [
        phone,
      ]);
    }

    const count = await pool.query("select count(*)::int as count from public.pin_history where user_id = $1", [
      user.userId,
    ]);
    expect(count.rows[0].count).toBe(3);

    // Registration's own PIN fingerprint plus 3 changes is 4 rows total;
    // trimming to the 3 most recent drops the original registration one.
    const fingerprints = await pool.query(
      "select pin_fingerprint from public.pin_history where user_id = $1 order by created_at",
      [user.userId],
    );
    expect(fingerprints.rows.map((row) => row.pin_fingerprint)).toEqual([
      "fingerprint-0",
      "fingerprint-1",
      "fingerprint-2",
    ]);
  });
});
