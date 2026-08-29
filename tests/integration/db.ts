import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { Pool } from "pg";

// Integration tests run against the real local Postgres instance -- no
// database mocks, per docs/ARCHITECTURE.md. Defaults to the fixed local
// Supabase connection string so `npm run db:start` + `npm run test:integration`
// works with no extra env setup.
const connectionString =
  process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

// max: 30 so the Phase 2 concurrency tests (up to 30 simultaneous transfers)
// genuinely fire together at the database level instead of queuing behind a
// smaller default pool, which would understate real concurrent contention.
export const pool = new Pool({ connectionString, max: 30 });

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// Must match ^\+8801[3-9][0-9]{8}$: "+8801" + one digit in [3-9] + 8 digits.
export function randomPhone(seed: string): string {
  const firstDigit = "3456789"[Number(seed) % 7];
  const rest = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return `+8801${firstDigit}${rest}`;
}

/**
 * Registers a user through the real Phase 4 OTP + complete_registration
 * path (Postgres side only, bypassing GoTrue) and returns everything a test
 * needs for an authenticated session. The resulting profile is PENDING_KYC
 * with no account yet -- for an already-ACTIVE user with a funded-ready
 * account, use createTestUser instead.
 */
export async function registerPendingKycUser(phone: string) {
  const userId = randomUUID();
  const sessionId = randomUUID();
  await pool.query("insert into auth.users (id, email) values ($1, $2)", [userId, `${userId}@test.local`]);

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, session_id: sessionId, role: "authenticated" }),
    ]);

    const sendResult = await client.query("select public.request_otp($1, 'REGISTRATION') as inbox_token", [
      phone,
    ]);
    const inboxToken = sendResult.rows[0].inbox_token as string;
    const codeResult = await client.query("select code from public.read_demo_sms($1)", [inboxToken]);
    const code = codeResult.rows[0].code as string;
    await client.query("select public.verify_otp($1, 'REGISTRATION', $2)", [phone, code]);

    const deviceToken = `device-${randomUUID()}`;
    await client.query("select public.complete_registration($1, $2, $3, $4)", [
      phone,
      `pin-fingerprint-${randomUUID()}`,
      sha256Hex(deviceToken),
      "test-agent",
    ]);
    await client.query("commit");

    return { userId, sessionId, deviceToken, phone };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Creates a UUID-suffixed test user (auth.users + profiles + accounts +
 * security_profiles + trusted_devices) and returns everything a test needs
 * to simulate an authenticated RLS session for it. Call `cleanup()` in
 * `afterAll`/`afterEach` to remove it -- deleting auth.users cascades
 * through every table via `on delete cascade`.
 */
export async function createTestUser(phoneSuffix: string) {
  const userId = randomUUID();
  const deviceId = randomUUID();
  const sessionId = randomUUID();
  const deviceToken = `test-device-${randomUUID()}`;
  const phone = `+8801${phoneSuffix}`;

  await pool.query("insert into auth.users (id, email) values ($1, $2)", [
    userId,
    `${userId}@test.local`,
  ]);
  await pool.query(
    "insert into public.profiles (id, phone, status) values ($1, $2, 'ACTIVE')",
    [userId, phone],
  );
  const accountResult = await pool.query<{ id: string }>(
    "insert into public.accounts (user_id, kind, wallet_number, status) values ($1, 'USER', $2, 'ACTIVE') returning id",
    [userId, phone],
  );
  const accountId = accountResult.rows[0].id;

  await pool.query(
    "insert into public.trusted_devices (id, user_id, token_hash) values ($1, $2, $3)",
    [deviceId, userId, sha256Hex(deviceToken)],
  );
  await pool.query(
    "insert into public.security_profiles (user_id, active_device_id, active_session_id) values ($1, $2, $3)",
    [userId, deviceId, sessionId],
  );

  return {
    userId,
    accountId,
    phone,
    deviceId,
    sessionId,
    deviceToken,
    cleanup: async () => {
      // transactions/ledger_entries/money_requests deliberately have no ON
      // DELETE cascade from accounts (financial history must survive account
      // deletion), so a hard test-cleanup has to remove them explicitly
      // first, in dependency order, before auth.users cascades the rest.
      // money_requests must go before transactions -- it references a
      // settlement transaction via settlement_transaction_id.
      await pool.query(
        "delete from public.money_requests where requester_account_id = $1 or payer_account_id = $1",
        [accountId],
      );
      await pool.query(
        `delete from public.ledger_entries
         where transaction_id in (
           select id from public.transactions
           where source_account_id = $1 or destination_account_id = $1
         )`,
        [accountId],
      );
      await pool.query(
        "delete from public.transactions where source_account_id = $1 or destination_account_id = $1",
        [accountId],
      );
      await pool.query("delete from public.accounts where id = $1", [accountId]);
      await pool.query("delete from auth.users where id = $1", [userId]);
    },
  };
}

export async function fundAccount(accountId: string, amountPoisha: number) {
  const systemAccount = await pool.query<{ id: string }>(
    "select id from public.accounts where kind = 'SYSTEM'",
  );
  await pool.query(
    "select public._move_money($1, $2, $3, gen_random_uuid(), 'test funding', 'INITIAL_FUNDING')",
    [systemAccount.rows[0].id, accountId, amountPoisha],
  );
}

/**
 * Runs `fn` against a dedicated connection with `role authenticated` and a
 * JWT claims GUC set, so `auth.uid()`/`auth.jwt()` and RLS policies see the
 * same context PostgREST would set for a real API request.
 */
export async function withAuthenticatedSession<T>(
  user: { userId: string; sessionId: string },
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: user.userId, session_id: user.sessionId, role: "authenticated" }),
    ]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
