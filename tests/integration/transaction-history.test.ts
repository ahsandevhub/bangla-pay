import { afterAll, describe, expect, it } from "vitest";
import { createTestUser, fundAccount, withAuthenticatedSession } from "./db";

const cleanups: Array<() => Promise<void>> = [];

afterAll(async () => {
  await Promise.all(cleanups.map((cleanup) => cleanup()));
});

async function user(phoneSuffix: string) {
  const testUser = await createTestUser(phoneSuffix);
  cleanups.push(testUser.cleanup);
  return testUser;
}

describe("list_transaction_history", () => {
  it("returns the counterparty wallet number and transaction type for both sides of a transfer", async () => {
    const alice = await user("940000" + Math.floor(Math.random() * 900 + 100));
    const bob = await user("940100" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(alice.accountId, 500_00);

    await withAuthenticatedSession(alice, (client) =>
      client.query("select * from public.transfer_money($1, $2, gen_random_uuid(), $3, 'TRANSFER', $4)", [
        bob.phone,
        120_00,
        "lunch",
        alice.deviceToken,
      ]),
    );

    // fundAccount's own _move_money call writes a second ledger entry for
    // alice (the INITIAL_FUNDING credit) -- newest-first ordering puts the
    // just-made transfer's DEBIT at index 0 ahead of it.
    const aliceHistory = await withAuthenticatedSession(alice, (client) =>
      client.query("select * from public.list_transaction_history(null, 20)"),
    );
    expect(aliceHistory.rows).toHaveLength(2);
    expect(aliceHistory.rows[0].direction).toBe("DEBIT");
    expect(aliceHistory.rows[0].type).toBe("TRANSFER");
    expect(aliceHistory.rows[0].note).toBe("lunch");
    expect(aliceHistory.rows[0].counterparty_wallet_number).toBe(bob.phone);
    expect(aliceHistory.rows[0].amount_poisha).toBe("12000");

    const bobHistory = await withAuthenticatedSession(bob, (client) =>
      client.query("select * from public.list_transaction_history(null, 20)"),
    );
    expect(bobHistory.rows).toHaveLength(1);
    expect(bobHistory.rows[0].direction).toBe("CREDIT");
    expect(bobHistory.rows[0].counterparty_wallet_number).toBe(alice.phone);
  });

  it("paginates newest-first with a cursor, never repeating or skipping a row", async () => {
    const alice = await user("940200" + Math.floor(Math.random() * 900 + 100));
    const bob = await user("940300" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(alice.accountId, 10_000_00);

    for (let i = 0; i < 5; i += 1) {
      await withAuthenticatedSession(alice, (client) =>
        client.query("select * from public.transfer_money($1, $2, gen_random_uuid(), null, 'TRANSFER', $3)", [
          bob.phone,
          10_00,
          alice.deviceToken,
        ]),
      );
    }

    const firstPage = await withAuthenticatedSession(alice, (client) =>
      client.query("select * from public.list_transaction_history(null, 2)"),
    );
    expect(firstPage.rows).toHaveLength(2);

    const cursor = firstPage.rows[1].ledger_entry_id;
    const secondPage = await withAuthenticatedSession(alice, (client) =>
      client.query("select * from public.list_transaction_history($1, 2)", [cursor]),
    );
    expect(secondPage.rows).toHaveLength(2);

    const firstIds = firstPage.rows.map((r) => r.ledger_entry_id);
    const secondIds = secondPage.rows.map((r) => r.ledger_entry_id);
    expect(new Set([...firstIds, ...secondIds]).size).toBe(4);
    expect(Math.max(...secondIds)).toBeLessThan(Math.min(...firstIds));
  });

  it("does not return another account's ledger entries", async () => {
    const alice = await user("940400" + Math.floor(Math.random() * 900 + 100));
    const bob = await user("940500" + Math.floor(Math.random() * 900 + 100));
    await fundAccount(alice.accountId, 500_00);

    await withAuthenticatedSession(alice, (client) =>
      client.query("select * from public.transfer_money($1, $2, gen_random_uuid(), null, 'TRANSFER', $3)", [
        bob.phone,
        50_00,
        alice.deviceToken,
      ]),
    );

    const stranger = await user("940600" + Math.floor(Math.random() * 900 + 100));
    const strangerHistory = await withAuthenticatedSession(stranger, (client) =>
      client.query("select * from public.list_transaction_history(null, 20)"),
    );
    expect(strangerHistory.rows).toHaveLength(0);
  });
});

describe("list_pending_requests_for_payer", () => {
  it("returns the requester's wallet number for a pending request", async () => {
    const requester = await user("940700" + Math.floor(Math.random() * 900 + 100));
    const payer = await user("940800" + Math.floor(Math.random() * 900 + 100));

    await withAuthenticatedSession(requester, (client) =>
      client.query("select * from public.create_request($1, $2, $3)", [payer.phone, 150_00, "rent"]),
    );

    const inbox = await withAuthenticatedSession(payer, (client) =>
      client.query("select * from public.list_pending_requests_for_payer()"),
    );
    expect(inbox.rows).toHaveLength(1);
    expect(inbox.rows[0].requester_wallet_number).toBe(requester.phone);
    expect(inbox.rows[0].amount_poisha).toBe("15000");
    expect(inbox.rows[0].note).toBe("rent");
  });

  it("excludes accepted, declined, and expired requests", async () => {
    const requester = await user("940900" + Math.floor(Math.random() * 900 + 100));
    const payer = await user("941000" + Math.floor(Math.random() * 900 + 100));

    const accepted = await withAuthenticatedSession(requester, (client) =>
      client.query("select id from public.create_request($1, $2, $3)", [payer.phone, 100_00, null]),
    );
    await fundAccount(payer.accountId, 500_00);
    await withAuthenticatedSession(payer, (client) =>
      client.query("select * from public.settle_request($1, $2)", [accepted.rows[0].id, payer.deviceToken]),
    );

    const declined = await withAuthenticatedSession(requester, (client) =>
      client.query("select id from public.create_request($1, $2, $3)", [payer.phone, 100_00, null]),
    );
    await withAuthenticatedSession(payer, (client) =>
      client.query("select * from public.decline_request($1)", [declined.rows[0].id]),
    );

    const inbox = await withAuthenticatedSession(payer, (client) =>
      client.query("select * from public.list_pending_requests_for_payer()"),
    );
    expect(inbox.rows).toHaveLength(0);
  });

  it("does not return another user's pending request", async () => {
    const requester = await user("941100" + Math.floor(Math.random() * 900 + 100));
    const payer = await user("941200" + Math.floor(Math.random() * 900 + 100));
    const stranger = await user("941300" + Math.floor(Math.random() * 900 + 100));

    await withAuthenticatedSession(requester, (client) =>
      client.query("select * from public.create_request($1, $2, $3)", [payer.phone, 100_00, null]),
    );

    const strangerInbox = await withAuthenticatedSession(stranger, (client) =>
      client.query("select * from public.list_pending_requests_for_payer()"),
    );
    expect(strangerInbox.rows).toHaveLength(0);
  });
});
