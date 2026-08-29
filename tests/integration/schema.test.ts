import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createTestUser, fundAccount, pool, withAuthenticatedSession } from "./db";

const cleanups: Array<() => Promise<void>> = [];

afterAll(async () => {
  await Promise.all(cleanups.map((cleanup) => cleanup()));
  await pool.end();
});

async function user(phoneSuffix: string) {
  const testUser = await createTestUser(phoneSuffix);
  cleanups.push(testUser.cleanup);
  return testUser;
}

describe("migrations and seed", () => {
  it("creates the hidden system funding account", async () => {
    const result = await pool.query(
      "select kind, status from public.accounts where wallet_number = 'SYSTEM-FUNDING'",
    );
    expect(result.rows).toEqual([{ kind: "SYSTEM", status: "ACTIVE" }]);
  });

  it("seeds the fixture NID records from docs/CONTRACTS.md", async () => {
    const result = await pool.query(
      "select nid_number from public.fake_nid_records order by nid_number",
    );
    expect(result.rows.map((row) => row.nid_number)).toEqual([
      "19920115123456701",
      "19930822123456702",
    ]);
  });
});

describe("constraints", () => {
  it("rejects a duplicate wallet_number", async () => {
    const a = await user("911100" + Math.floor(Math.random() * 900 + 100));
    await expect(
      pool.query(
        "insert into public.accounts (user_id, kind, wallet_number) select $1, 'USER', $2",
        [a.userId, a.phone],
      ),
    ).rejects.toThrow(/duplicate key value/);
  });

  it("rejects a negative balance on a USER account", async () => {
    const a = await user("911200" + Math.floor(Math.random() * 900 + 100));
    await expect(
      pool.query("update public.accounts set balance_poisha = -1 where id = $1", [a.accountId]),
    ).rejects.toThrow(/accounts_user_balance_non_negative/);
  });

  it("rejects a transaction whose source and destination account are the same", async () => {
    const a = await user("911300" + Math.floor(Math.random() * 900 + 100));
    await expect(
      pool.query(
        `insert into public.transactions
           (type, source_account_id, destination_account_id, amount_poisha, idempotency_key)
         values ('TRANSFER', $1, $1, 100, gen_random_uuid())`,
        [a.accountId],
      ),
    ).rejects.toThrow(/transactions_no_self_transfer/);
  });

  it("forbids updating or deleting a ledger entry even for a role granted access and RLS bypass", async () => {
    // The grant-level block (tested separately below) is the first line of
    // defense, and RLS with no UPDATE/DELETE policy is a second (it zeroes
    // out affected rows before a trigger would even see them). This proves
    // the append-only trigger is a genuinely separate third layer: grant a
    // temporary role both table privileges AND an RLS bypass -- simulating
    // the worst case, a future migration bug that over-grants both -- and
    // confirm the trigger still blocks it.
    const a = await user("911400" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(a.accountId, 100_00);
    const entry = await pool.query<{ id: string }>(
      "select id from public.ledger_entries where account_id = $1 limit 1",
      [a.accountId],
    );
    const entryId = entry.rows[0].id;

    const client = await pool.connect();
    try {
      // Self-healing: if a previous run of this test crashed before its own
      // cleanup ran, the role may still exist with grants attached.
      await client.query(
        "revoke select, update, delete on public.ledger_entries from ledger_trigger_test_role",
      ).catch(() => {});
      await client.query(
        "revoke usage on schema public from ledger_trigger_test_role",
      ).catch(() => {});
      await client.query("drop role if exists ledger_trigger_test_role");
      await client.query("create role ledger_trigger_test_role bypassrls");
      // SET ROLE requires membership; the connecting `postgres` role here has
      // CREATEROLE but is not automatically a member of roles it creates
      // (Supabase's local `postgres` is not the actual superuser).
      await client.query("grant ledger_trigger_test_role to postgres");
      await client.query("grant usage on schema public to ledger_trigger_test_role");
      // SELECT is required too: evaluating `WHERE id = $1` needs SELECT
      // privilege on the table, independent of the UPDATE/DELETE privilege.
      await client.query(
        "grant select, update, delete on public.ledger_entries to ledger_trigger_test_role",
      );
      await client.query("set role ledger_trigger_test_role");

      await expect(
        client.query("update public.ledger_entries set amount_poisha = 1 where id = $1", [entryId]),
      ).rejects.toThrow(/LEDGER_IMMUTABLE/);
      await expect(
        client.query("delete from public.ledger_entries where id = $1", [entryId]),
      ).rejects.toThrow(/LEDGER_IMMUTABLE/);
    } finally {
      try {
        await client.query("reset role");
        await client.query(
          "revoke select, update, delete on public.ledger_entries from ledger_trigger_test_role",
        );
        await client.query("revoke usage on schema public from ledger_trigger_test_role");
        await client.query("drop role if exists ledger_trigger_test_role");
      } finally {
        client.release();
      }
    }
  });
});

describe("grants: authenticated cannot write financial tables directly", () => {
  it("rejects a direct INSERT into accounts", async () => {
    const a = await user("911500" + Math.floor(Math.random() * 900 + 100));
    await expect(
      withAuthenticatedSession(a, (client) =>
        client.query(
          "insert into public.accounts (user_id, kind, wallet_number) values ($1, 'USER', 'x')",
          [a.userId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("rejects a direct UPDATE on ledger_entries", async () => {
    const a = await user("911600" + Math.floor(Math.random() * 900 + 100));
    await expect(
      withAuthenticatedSession(a, (client) =>
        client.query("update public.ledger_entries set amount_poisha = 1 where true"),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("row level security: accounts require ownership and an active session", () => {
  it("returns the caller's own account with a valid session", async () => {
    const a = await user("911700" + Math.floor(Math.random() * 900 + 100));
    const rows = await withAuthenticatedSession(a, async (client) => {
      const result = await client.query("select wallet_number from public.accounts where user_id = $1", [
        a.userId,
      ]);
      return result.rows;
    });
    expect(rows).toEqual([{ wallet_number: a.phone }]);
  });

  it("returns nothing when the session_id claim does not match active_session_id", async () => {
    const a = await user("911800" + Math.floor(Math.random() * 900 + 100));
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: a.userId, session_id: randomUUID(), role: "authenticated" }),
      ]);
      const result = await client.query("select wallet_number from public.accounts where user_id = $1", [
        a.userId,
      ]);
      expect(result.rows).toEqual([]);
      await client.query("commit");
    } finally {
      client.release();
    }
  });
});

describe("transfer_money", () => {
  it("moves money and replays an idempotent retry without double-spending", async () => {
    const payer = await user("912000" + Math.floor(Math.random() * 900 + 100));
    const payee = await user("912100" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 500_00);

    const idempotencyKey = randomUUID();

    const first = await withAuthenticatedSession(payer, (client) =>
      client.query(
        "select transaction_id, replayed from public.transfer_money($1, $2, $3, $4, 'TRANSFER', $5)",
        [payee.phone, 250_00, idempotencyKey, "test", payer.deviceToken],
      ),
    );
    expect(first.rows[0].replayed).toBe(false);

    const second = await withAuthenticatedSession(payer, (client) =>
      client.query(
        "select transaction_id, replayed from public.transfer_money($1, $2, $3, $4, 'TRANSFER', $5)",
        [payee.phone, 250_00, idempotencyKey, "test", payer.deviceToken],
      ),
    );
    expect(second.rows[0].replayed).toBe(true);
    expect(second.rows[0].transaction_id).toBe(first.rows[0].transaction_id);

    const payerBalance = await pool.query<{ balance_poisha: string }>(
      "select balance_poisha from public.accounts where id = $1",
      [payer.accountId],
    );
    const payeeBalance = await pool.query<{ balance_poisha: string }>(
      "select balance_poisha from public.accounts where id = $1",
      [payee.accountId],
    );
    expect(payerBalance.rows[0].balance_poisha).toBe("25000");
    expect(payeeBalance.rows[0].balance_poisha).toBe("25000");
  });

  it("rejects a self-transfer", async () => {
    const a = await user("912200" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(a.accountId, 500_00);

    await expect(
      withAuthenticatedSession(a, (client) =>
        client.query("select public.transfer_money($1, $2, $3, null, 'TRANSFER', $4)", [
          a.phone,
          100,
          randomUUID(),
          a.deviceToken,
        ]),
      ),
    ).rejects.toThrow(/SELF_TRANSFER/);
  });

  it("rejects a transfer that exceeds the source balance", async () => {
    const payer = await user("912300" + Math.floor(Math.random() * 900 + 100));
    const payee = await user("912400" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 100_00);

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
  });

  it("rejects a client-supplied INITIAL_FUNDING transaction type", async () => {
    const payer = await user("912500" + Math.floor(Math.random() * 900 + 100));
    const payee = await user("912600" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 500_00);

    await expect(
      withAuthenticatedSession(payer, (client) =>
        client.query("select public.transfer_money($1, $2, $3, null, 'INITIAL_FUNDING', $4)", [
          payee.phone,
          100,
          randomUUID(),
          payer.deviceToken,
        ]),
      ),
    ).rejects.toThrow(/VALIDATION_ERROR/);
  });
});

describe("verify_ledger_integrity", () => {
  it("reports ok=true for every account after a transfer", async () => {
    const payer = await user("912700" + Math.floor(Math.random() * 900 + 100));
    const payee = await user("912800" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 500_00);

    await withAuthenticatedSession(payer, (client) =>
      client.query("select public.transfer_money($1, $2, $3, null, 'TRANSFER', $4)", [
        payee.phone,
        100_00,
        randomUUID(),
        payer.deviceToken,
      ]),
    );

    const result = await pool.query<{ ok: boolean }>(
      "select ok from public.verify_ledger_integrity() where account_id in ($1, $2)",
      [payer.accountId, payee.accountId],
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((row) => row.ok)).toBe(true);
  });
});
