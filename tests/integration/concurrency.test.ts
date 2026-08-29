import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createTestUser, fundAccount, pool, withAuthenticatedSession } from "./db";

// Phase 2 (docs/DEVELOPMENT-WORKFLOW.md): the financial integration suite
// that must exist and pass before any Phase 3+ UI work begins. Uses real
// local PostgreSQL throughout -- no database mocks.

const cleanups: Array<() => Promise<void>> = [];

afterAll(async () => {
  await Promise.all(cleanups.map((cleanup) => cleanup()));
});

async function user(phoneSuffix: string) {
  const testUser = await createTestUser(phoneSuffix);
  cleanups.push(testUser.cleanup);
  return testUser;
}

async function balanceOf(accountId: string): Promise<bigint> {
  const result = await pool.query<{ balance_poisha: string }>(
    "select balance_poisha from public.accounts where id = $1",
    [accountId],
  );
  return BigInt(result.rows[0].balance_poisha);
}

async function reconciles(accountIds: string[]) {
  const result = await pool.query<{ ok: boolean }>(
    "select ok from public.verify_ledger_integrity() where account_id = any($1::uuid[])",
    [accountIds],
  );
  expect(result.rows).toHaveLength(accountIds.length);
  expect(result.rows.every((row) => row.ok)).toBe(true);
}

describe("transfer happy path and idempotency", () => {
  it("moves money and writes exactly one debit and one credit", async () => {
    const payer = await user("920000" + Math.floor(Math.random() * 900 + 100));
    const payee = await user("920100" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 500_00);

    const result = await withAuthenticatedSession(payer, (client) =>
      client.query(
        "select transaction_id from public.transfer_money($1, $2, $3, null, 'TRANSFER', $4)",
        [payee.phone, 250_00, randomUUID(), payer.deviceToken],
      ),
    );
    const transactionId = result.rows[0].transaction_id;

    const entries = await pool.query(
      "select account_id, direction from public.ledger_entries where transaction_id = $1",
      [transactionId],
    );
    expect(entries.rows).toHaveLength(2);
    expect(entries.rows).toContainEqual({ account_id: payer.accountId, direction: "DEBIT" });
    expect(entries.rows).toContainEqual({ account_id: payee.accountId, direction: "CREDIT" });

    await reconciles([payer.accountId, payee.accountId]);
  });

  it("fails an overdraft without changing either balance", async () => {
    const payer = await user("920200" + Math.floor(Math.random() * 900 + 100));
    const payee = await user("920300" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 100_00);

    const payerBefore = await balanceOf(payer.accountId);
    const payeeBefore = await balanceOf(payee.accountId);

    await expect(
      withAuthenticatedSession(payer, (client) =>
        client.query("select public.transfer_money($1, $2, $3, null, 'TRANSFER', $4)", [
          payee.phone,
          1_000_00,
          randomUUID(),
          payer.deviceToken,
        ]),
      ),
    ).rejects.toThrow(/INSUFFICIENT_FUNDS/);

    expect(await balanceOf(payer.accountId)).toBe(payerBefore);
    expect(await balanceOf(payee.accountId)).toBe(payeeBefore);
    await reconciles([payer.accountId, payee.accountId]);
  });

  it("reusing an idempotency key returns the same transaction with exactly one debit", async () => {
    const payer = await user("920400" + Math.floor(Math.random() * 900 + 100));
    const payee = await user("920500" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 500_00);
    const idempotencyKey = randomUUID();

    const attempts = await Promise.all(
      Array.from({ length: 5 }, () =>
        withAuthenticatedSession(payer, (client) =>
          client.query(
            "select transaction_id, replayed from public.transfer_money($1, $2, $3, null, 'TRANSFER', $4)",
            [payee.phone, 250_00, idempotencyKey, payer.deviceToken],
          ),
        ),
      ),
    );

    const transactionIds = new Set(attempts.map((a) => a.rows[0].transaction_id));
    expect(transactionIds.size).toBe(1);
    expect(attempts.filter((a) => a.rows[0].replayed === false)).toHaveLength(1);

    const debits = await pool.query(
      "select count(*)::int as count from public.ledger_entries where account_id = $1 and direction = 'DEBIT'",
      [payer.accountId],
    );
    expect(debits.rows[0].count).toBe(1);
    expect(await balanceOf(payer.accountId)).toBe(250_00n);
    await reconciles([payer.accountId, payee.accountId]);
  });
});

describe("concurrent transfer races", () => {
  it("20 concurrent attempts against a tight balance yield exactly one success and a zero final balance", async () => {
    const payer = await user("920600" + Math.floor(Math.random() * 900 + 100));
    const payee = await user("920700" + Math.floor(Math.random() * 900 + 100));
    const amount = 500_00;
    await fundAccount(payer.accountId, amount);

    const attempts = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        withAuthenticatedSession(payer, (client) =>
          client.query("select public.transfer_money($1, $2, $3, null, 'TRANSFER', $4)", [
            payee.phone,
            amount,
            randomUUID(), // distinct key per attempt -- these are 20 different attempts, not retries
            payer.deviceToken,
          ]),
        ),
      ),
    );

    const succeeded = attempts.filter((a) => a.status === "fulfilled");
    const failed = attempts.filter((a) => a.status === "rejected");
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(19);
    for (const failure of failed as PromiseRejectedResult[]) {
      expect(String(failure.reason)).toMatch(/INSUFFICIENT_FUNDS/);
    }

    expect(await balanceOf(payer.accountId)).toBe(0n);
    expect(await balanceOf(payee.accountId)).toBe(BigInt(amount));
    await reconciles([payer.accountId, payee.accountId]);
  });

  it("30 bidirectional concurrent transfers complete without deadlock errors", async () => {
    const a = await user("920800" + Math.floor(Math.random() * 900 + 100));
    const b = await user("920900" + Math.floor(Math.random() * 900 + 100));
    const startingBalance = 1_000_00;
    const transferAmount = 100;
    await fundAccount(a.accountId, startingBalance);
    await fundAccount(b.accountId, startingBalance);

    const aToB = Array.from({ length: 15 }, () =>
      withAuthenticatedSession(a, (client) =>
        client.query("select public.transfer_money($1, $2, $3, null, 'TRANSFER', $4)", [
          b.phone,
          transferAmount,
          randomUUID(),
          a.deviceToken,
        ]),
      ),
    );
    const bToA = Array.from({ length: 15 }, () =>
      withAuthenticatedSession(b, (client) =>
        client.query("select public.transfer_money($1, $2, $3, null, 'TRANSFER', $4)", [
          a.phone,
          transferAmount,
          randomUUID(),
          b.deviceToken,
        ]),
      ),
    );

    const results = await Promise.allSettled([...aToB, ...bToA]);
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

    // Equal starting balances and equal transfer counts in each direction
    // mean none of these should ever hit INSUFFICIENT_FUNDS; any rejection
    // here is unexpected. The specific thing Defense 2 (fixed lock order)
    // guarantees is that none of these rejections is a raw Postgres deadlock.
    for (const failure of rejected) {
      expect(String(failure.reason)).not.toMatch(/deadlock detected/i);
    }
    expect(rejected).toHaveLength(0);

    // 15 transfers of 100 poisha each way net to zero -- both accounts
    // should be back at their starting balance.
    expect(await balanceOf(a.accountId)).toBe(BigInt(startingBalance));
    expect(await balanceOf(b.accountId)).toBe(BigInt(startingBalance));
    await reconciles([a.accountId, b.accountId]);
  });
});

describe("domain error codes are deterministic", () => {
  it("raises ACCOUNT_NOT_FOUND for an unknown destination wallet", async () => {
    const payer = await user("921000" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 500_00);

    await expect(
      withAuthenticatedSession(payer, (client) =>
        client.query("select public.transfer_money($1, $2, $3, null, 'TRANSFER', $4)", [
          "+8801999999999",
          100,
          randomUUID(),
          payer.deviceToken,
        ]),
      ),
    ).rejects.toThrow(/ACCOUNT_NOT_FOUND/);
  });

  it("raises ACCOUNT_INACTIVE for a suspended destination account", async () => {
    const payer = await user("921100" + Math.floor(Math.random() * 900 + 100));
    const payee = await user("921200" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 500_00);
    await pool.query("update public.accounts set status = 'INACTIVE' where id = $1", [payee.accountId]);

    await expect(
      withAuthenticatedSession(payer, (client) =>
        client.query("select public.transfer_money($1, $2, $3, null, 'TRANSFER', $4)", [
          payee.phone,
          100,
          randomUUID(),
          payer.deviceToken,
        ]),
      ),
    ).rejects.toThrow(/ACCOUNT_INACTIVE/);
  });

  it("raises DEVICE_REPLACED for a stale device token", async () => {
    const payer = await user("921300" + Math.floor(Math.random() * 900 + 100));
    const payee = await user("921400" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 500_00);

    await expect(
      withAuthenticatedSession(payer, (client) =>
        client.query("select public.transfer_money($1, $2, $3, null, 'TRANSFER', $4)", [
          payee.phone,
          100,
          randomUUID(),
          "some-other-devices-token",
        ]),
      ),
    ).rejects.toThrow(/DEVICE_REPLACED/);
  });

  it("raises UNAUTHENTICATED with no JWT claims set", async () => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role authenticated");
      await expect(
        client.query("select public.transfer_money($1, $2, $3, null, 'TRANSFER', $4)", [
          "+8801999999999",
          100,
          randomUUID(),
          "irrelevant",
        ]),
      ).rejects.toThrow(/UNAUTHENTICATED/);
      await client.query("rollback");
    } finally {
      client.release();
    }
  });

  it("raises INACTIVE_SESSION when the JWT session_id does not match active_session_id", async () => {
    const payer = await user("921500" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 500_00);

    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: payer.userId, session_id: randomUUID(), role: "authenticated" }),
      ]);
      await expect(
        client.query("select public.transfer_money($1, $2, $3, null, 'TRANSFER', $4)", [
          "+8801999999999",
          100,
          randomUUID(),
          payer.deviceToken,
        ]),
      ).rejects.toThrow(/INACTIVE_SESSION/);
      await client.query("rollback");
    } finally {
      client.release();
    }
  });
});
