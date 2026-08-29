import { afterAll, describe, expect, it } from "vitest";
import { createTestUser, fundAccount, pool, withAuthenticatedSession } from "./db";

const cleanups: Array<() => Promise<void>> = [];

afterAll(async () => {
  await Promise.all(cleanups.map((cleanup) => cleanup()));
});

async function user(phoneSuffix: string) {
  const testUser = await createTestUser(phoneSuffix);
  cleanups.push(testUser.cleanup);
  return testUser;
}

describe("create_request", () => {
  it("creates a pending request from requester to payer", async () => {
    const requester = await user("930000" + Math.floor(Math.random() * 900 + 100));
    const payer = await user("930100" + Math.floor(Math.random() * 900 + 100));

    const result = await withAuthenticatedSession(requester, (client) =>
      client.query(
        "select * from public.create_request($1, $2, $3)",
        [payer.phone, 120_00, "lunch"],
      ),
    );

    const row = result.rows[0];
    expect(row.status).toBe("PENDING");
    expect(row.requester_account_id).toBe(requester.accountId);
    expect(row.payer_account_id).toBe(payer.accountId);
    expect(row.amount_poisha).toBe("12000");
    expect(row.settlement_transaction_id).toBeNull();
  });

  it("rejects a self-request", async () => {
    const requester = await user("930200" + Math.floor(Math.random() * 900 + 100));

    await expect(
      withAuthenticatedSession(requester, (client) =>
        client.query("select * from public.create_request($1, $2, $3)", [
          requester.phone,
          100,
          null,
        ]),
      ),
    ).rejects.toThrow(/SELF_TRANSFER/);
  });

  it("rejects an unknown payer wallet", async () => {
    const requester = await user("930300" + Math.floor(Math.random() * 900 + 100));

    await expect(
      withAuthenticatedSession(requester, (client) =>
        client.query("select * from public.create_request($1, $2, $3)", [
          "+8801999999998",
          100,
          null,
        ]),
      ),
    ).rejects.toThrow(/ACCOUNT_NOT_FOUND/);
  });

  it("rejects a non-positive amount", async () => {
    const requester = await user("930400" + Math.floor(Math.random() * 900 + 100));
    const payer = await user("930500" + Math.floor(Math.random() * 900 + 100));

    await expect(
      withAuthenticatedSession(requester, (client) =>
        client.query("select * from public.create_request($1, $2, $3)", [payer.phone, 0, null]),
      ),
    ).rejects.toThrow(/INVALID_AMOUNT/);
  });
});

describe("settle_request", () => {
  async function createPendingRequest(requester: Awaited<ReturnType<typeof user>>, payerPhone: string, amount = 120_00) {
    const result = await withAuthenticatedSession(requester, (client) =>
      client.query("select id from public.create_request($1, $2, $3)", [payerPhone, amount, null]),
    );
    return result.rows[0].id as string;
  }

  it("moves money, marks the request accepted, and links the settlement transaction", async () => {
    const requester = await user("930600" + Math.floor(Math.random() * 900 + 100));
    const payer = await user("930700" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 500_00);
    const requestId = await createPendingRequest(requester, payer.phone, 120_00);

    const result = await withAuthenticatedSession(payer, (client) =>
      client.query("select transaction_id, amount_poisha, replayed from public.settle_request($1, $2)", [
        requestId,
        payer.deviceToken,
      ]),
    );
    expect(result.rows[0].amount_poisha).toBe("12000");
    expect(result.rows[0].replayed).toBe(false);

    const request = await pool.query("select status, settlement_transaction_id from public.money_requests where id = $1", [
      requestId,
    ]);
    expect(request.rows[0].status).toBe("ACCEPTED");
    expect(request.rows[0].settlement_transaction_id).toBe(result.rows[0].transaction_id);

    const payerBalance = await pool.query("select balance_poisha from public.accounts where id = $1", [
      payer.accountId,
    ]);
    expect(payerBalance.rows[0].balance_poisha).toBe("38000");
  });

  it("rejects settlement by anyone other than the designated payer", async () => {
    const requester = await user("930800" + Math.floor(Math.random() * 900 + 100));
    const payer = await user("930900" + Math.floor(Math.random() * 900 + 100));
    const impostor = await user("931000" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(impostor.accountId, 500_00);
    const requestId = await createPendingRequest(requester, payer.phone);

    await expect(
      withAuthenticatedSession(impostor, (client) =>
        client.query("select * from public.settle_request($1, $2)", [requestId, impostor.deviceToken]),
      ),
    ).rejects.toThrow(/REQUEST_UNAUTHORIZED/);
  });

  it("cannot be settled twice", async () => {
    const requester = await user("931100" + Math.floor(Math.random() * 900 + 100));
    const payer = await user("931200" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 500_00);
    const requestId = await createPendingRequest(requester, payer.phone);

    await withAuthenticatedSession(payer, (client) =>
      client.query("select * from public.settle_request($1, $2)", [requestId, payer.deviceToken]),
    );

    await expect(
      withAuthenticatedSession(payer, (client) =>
        client.query("select * from public.settle_request($1, $2)", [requestId, payer.deviceToken]),
      ),
    ).rejects.toThrow(/REQUEST_NOT_PENDING/);
  });

  it("rejects an overdue request without persisting a partial status change", async () => {
    const requester = await user("931300" + Math.floor(Math.random() * 900 + 100));
    const payer = await user("931400" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(payer.accountId, 500_00);
    const requestId = await createPendingRequest(requester, payer.phone);
    await pool.query("update public.money_requests set expires_at = now() - interval '1 minute' where id = $1", [
      requestId,
    ]);

    await expect(
      withAuthenticatedSession(payer, (client) =>
        client.query("select * from public.settle_request($1, $2)", [requestId, payer.deviceToken]),
      ),
    ).rejects.toThrow(/REQUEST_EXPIRED/);

    // A raised exception rolls back the whole call, so settle_request cannot
    // durably flip the row to EXPIRED as a side effect of rejecting it --
    // that's expire_money_requests()'s job. The row stays PENDING (though
    // overdue) until that sweep runs.
    const request = await pool.query("select status from public.money_requests where id = $1", [requestId]);
    expect(request.rows[0].status).toBe("PENDING");
  });

  it("expire_money_requests sweeps an overdue request to EXPIRED", async () => {
    const requester = await user("931350" + Math.floor(Math.random() * 900 + 100));
    const payer = await user("931450" + Math.floor(Math.random() * 900 + 100));
    const requestId = await createPendingRequest(requester, payer.phone);
    await pool.query("update public.money_requests set expires_at = now() - interval '1 minute' where id = $1", [
      requestId,
    ]);

    await pool.query("select public.expire_money_requests()");

    const request = await pool.query("select status from public.money_requests where id = $1", [requestId]);
    expect(request.rows[0].status).toBe("EXPIRED");
  });
});

describe("decline_request", () => {
  it("marks a pending request declined", async () => {
    const requester = await user("931500" + Math.floor(Math.random() * 900 + 100));
    const payer = await user("931600" + Math.floor(Math.random() * 900 + 100));
    const created = await withAuthenticatedSession(requester, (client) =>
      client.query("select id from public.create_request($1, $2, $3)", [payer.phone, 100, null]),
    );
    const requestId = created.rows[0].id as string;

    const result = await withAuthenticatedSession(payer, (client) =>
      client.query("select status from public.decline_request($1)", [requestId]),
    );
    expect(result.rows[0].status).toBe("DECLINED");
  });

  it("rejects decline by anyone other than the designated payer", async () => {
    const requester = await user("931700" + Math.floor(Math.random() * 900 + 100));
    const payer = await user("931800" + Math.floor(Math.random() * 900 + 100));
    const impostor = await user("931900" + Math.floor(Math.random() * 900 + 100));
    const created = await withAuthenticatedSession(requester, (client) =>
      client.query("select id from public.create_request($1, $2, $3)", [payer.phone, 100, null]),
    );
    const requestId = created.rows[0].id as string;

    await expect(
      withAuthenticatedSession(impostor, (client) =>
        client.query("select * from public.decline_request($1)", [requestId]),
      ),
    ).rejects.toThrow(/REQUEST_UNAUTHORIZED/);
  });
});
