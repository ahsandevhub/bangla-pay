import { afterAll, describe, expect, it } from "vitest";
import { pool, randomPhone, registerPendingKycUser, withAuthenticatedSession } from "./db";

// Phase 5: activate_account_after_kyc (matching, one-verified-user-per-NID
// under concurrency, and account creation + funding), tested directly
// against real Postgres. Each test seeds its own fake_nid_records row
// rather than reusing docs/CONTRACTS.md's two shared fixtures, so tests
// never contend with each other over NID uniqueness.

const cleanups: Array<() => Promise<void>> = [];

afterAll(async () => {
  await Promise.all(cleanups.map((cleanup) => cleanup()));
});

function randomNidNumber(): string {
  return Array.from({ length: 17 }, () => Math.floor(Math.random() * 10)).join("");
}

async function seedFakeNidRecord(overrides?: {
  dateOfBirth?: string;
  banglaName?: string;
  englishName?: string;
}) {
  const record = {
    nidNumber: randomNidNumber(),
    dateOfBirth: overrides?.dateOfBirth ?? "1992-01-15",
    banglaName: overrides?.banglaName ?? "টেস্ট ইউজার",
    englishName: overrides?.englishName ?? "Test User",
  };
  await pool.query(
    "insert into public.fake_nid_records (nid_number, date_of_birth, bangla_name, english_name) values ($1, $2, $3, $4)",
    [record.nidNumber, record.dateOfBirth, record.banglaName, record.englishName],
  );
  cleanups.push(async () => {
    await pool.query("delete from public.fake_nid_records where nid_number = $1", [record.nidNumber]);
  });
  return record;
}

/**
 * The real fingerprint derivation (lib/auth/credentials.ts's
 * deriveNidFingerprint) is unit-tested separately; these SQL-level tests
 * only need the invariant "same NID -> same fingerprint", which any
 * deterministic string satisfies -- so a plain per-NID string stands in
 * for it here rather than replicating the real HMAC derivation.
 */
function fingerprintFor(nidNumber: string): string {
  return `fp-${nidNumber}`;
}

async function registerUser(seed: string) {
  const user = await registerPendingKycUser(randomPhone(seed));
  cleanups.push(async () => {
    // Same dependency-order requirement as createTestUser's cleanup in
    // db.ts: a successful KYC verification creates an account plus an
    // INITIAL_FUNDING transaction/ledger entries, none of which cascade
    // from auth.users, and transactions must go before accounts.
    const account = await pool.query("select id from public.accounts where user_id = $1", [user.userId]);
    const accountId = account.rows[0]?.id;
    if (accountId) {
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
    }
    await pool.query("delete from auth.users where id = $1", [user.userId]);
  });
  return user;
}

function verifyKyc(
  user: { userId: string; sessionId: string },
  record: { nidNumber: string; dateOfBirth: string; banglaName: string; englishName: string },
  overrides?: Partial<typeof record>,
) {
  const submitted = { ...record, ...overrides };
  return withAuthenticatedSession(user, (client) =>
    client.query(
      "select * from public.activate_account_after_kyc($1, $2, $3, $4, $5, $6)",
      [
        "test-doc-path.jpg",
        submitted.nidNumber,
        submitted.dateOfBirth,
        submitted.banglaName,
        submitted.englishName,
        fingerprintFor(record.nidNumber),
      ],
    ),
  );
}

/**
 * KYC_NO_MATCH and NID_ALREADY_USED come back as a REJECTED result row
 * rather than a raised exception (see the comment on
 * activate_account_after_kyc in the migration) -- this checks that shape.
 * ACCOUNT_NOT_FOUND, ACCOUNT_ALREADY_VERIFIED, and KYC_ATTEMPTS_EXCEEDED
 * are still raised directly and use .rejects.toThrow instead.
 */
async function expectRejected(
  user: { userId: string; sessionId: string },
  record: { nidNumber: string; dateOfBirth: string; banglaName: string; englishName: string },
  overrides: Partial<typeof record> | undefined,
  failureCode: string,
) {
  const result = await verifyKyc(user, record, overrides);
  expect(result.rows[0].status).toBe("REJECTED");
  expect(result.rows[0].failure_code).toBe(failureCode);
  expect(result.rows[0].account_id).toBeNull();
}

describe("activate_account_after_kyc: happy path", () => {
  it("verifies a matching submission, creates and funds the account, and reconciles", async () => {
    const record = await seedFakeNidRecord();
    const user = await registerUser("51");

    const result = await verifyKyc(user, record);
    expect(result.rows[0].status).toBe("VERIFIED");
    expect(result.rows[0].failure_code).toBeNull();
    expect(result.rows[0].wallet_number).toBe(user.phone);
    expect(result.rows[0].balance_poisha).toBe("10000000");

    const profile = await pool.query("select status from public.profiles where id = $1", [user.userId]);
    expect(profile.rows[0].status).toBe("ACTIVE");

    const accountId = result.rows[0].account_id;
    const reconciliation = await pool.query(
      "select ok from public.verify_ledger_integrity() where account_id = $1",
      [accountId],
    );
    expect(reconciliation.rows[0].ok).toBe(true);
  });

  it("matches on Bangla name alone when the English name differs", async () => {
    const record = await seedFakeNidRecord({ englishName: "Original Name" });
    const user = await registerUser("52");

    const result = await verifyKyc(user, record, { englishName: "Totally Different" });
    expect(result.rows[0].status).toBe("VERIFIED");
  });
});

describe("activate_account_after_kyc: rejections create no account or funding", () => {
  async function expectNoAccountCreated(userId: string) {
    const account = await pool.query("select id from public.accounts where user_id = $1", [userId]);
    expect(account.rows).toHaveLength(0);
    const profile = await pool.query("select status from public.profiles where id = $1", [userId]);
    expect(profile.rows[0].status).toBe("PENDING_KYC");
  }

  it("rejects a wrong date of birth (KYC_NO_MATCH) and creates no account", async () => {
    const record = await seedFakeNidRecord({ dateOfBirth: "1992-01-15" });
    const user = await registerUser("53");

    await expectRejected(user, record, { dateOfBirth: "1999-01-01" }, "KYC_NO_MATCH");
    await expectNoAccountCreated(user.userId);
  });

  it("rejects when neither name matches (KYC_NO_MATCH) and creates no account", async () => {
    const record = await seedFakeNidRecord();
    const user = await registerUser("54");

    await expectRejected(user, record, { banglaName: "ভুল নাম", englishName: "Wrong Name" }, "KYC_NO_MATCH");
    await expectNoAccountCreated(user.userId);
  });

  it("rejects an unrecognized NID number and creates no account", async () => {
    const user = await registerUser("55");
    await expectRejected(
      user,
      {
        nidNumber: randomNidNumber(),
        dateOfBirth: "1992-01-15",
        banglaName: "কেউ না",
        englishName: "Nobody",
      },
      undefined,
      "KYC_NO_MATCH",
    );
    await expectNoAccountCreated(user.userId);
  });

  it("persists each rejected attempt and locks out after three within an hour", async () => {
    const record = await seedFakeNidRecord();
    const user = await registerUser("56");

    for (let i = 0; i < 3; i++) {
      await expectRejected(user, record, { dateOfBirth: "1999-01-01" }, "KYC_NO_MATCH");
    }

    const rejectedCount = await pool.query(
      "select count(*)::int as count from public.kyc_verifications where user_id = $1 and status = 'REJECTED'",
      [user.userId],
    );
    expect(rejectedCount.rows[0].count).toBe(3);

    await expect(verifyKyc(user, record)).rejects.toThrow(/KYC_ATTEMPTS_EXCEEDED/);
  });

  it("rejects a second verification attempt once already verified", async () => {
    const record = await seedFakeNidRecord();
    const user = await registerUser("57");
    await verifyKyc(user, record);

    const secondRecord = await seedFakeNidRecord();
    await expect(verifyKyc(user, secondRecord)).rejects.toThrow(/ACCOUNT_ALREADY_VERIFIED/);
  });
});

describe("activate_account_after_kyc: one verified user per NID", () => {
  it("rejects a second user claiming an already-verified NID", async () => {
    const record = await seedFakeNidRecord();
    const firstUser = await registerUser("61");
    const secondUser = await registerUser("62");

    await verifyKyc(firstUser, record);
    await expectRejected(secondUser, record, undefined, "NID_ALREADY_USED");

    const secondAccount = await pool.query("select id from public.accounts where user_id = $1", [
      secondUser.userId,
    ]);
    expect(secondAccount.rows).toHaveLength(0);
  });

  it("under concurrent submission of the same NID, exactly one user is verified", async () => {
    const record = await seedFakeNidRecord();
    const userA = await registerUser("63");
    const userB = await registerUser("64");

    const results = await Promise.all([verifyKyc(userA, record), verifyKyc(userB, record)]);
    const statuses = results.map((r) => r.rows[0].status).sort();

    expect(statuses).toEqual(["REJECTED", "VERIFIED"]);

    const accounts = await pool.query(
      "select count(*)::int as count from public.accounts where user_id in ($1, $2)",
      [userA.userId, userB.userId],
    );
    expect(accounts.rows[0].count).toBe(1);
  });
});

describe("kyc-documents storage: private per user", () => {
  it("cannot be listed or read by another authenticated user", async () => {
    const owner = await registerUser("71");
    const stranger = await registerUser("72");
    const path = `${owner.userId}/nid-front.jpg`;

    // storage.objects has a protect_objects_delete trigger that blocks even
    // a direct superuser DELETE (Supabase steers callers toward the Storage
    // API instead) -- doing the whole test in one transaction and rolling
    // back avoids ever needing to delete the row at all, and guarantees
    // cleanup regardless of how the assertions below turn out.
    const client = await pool.connect();
    try {
      await client.query("begin");
      // Inserted while still the postgres role, before switching to
      // authenticated -- RLS would otherwise block this insert too.
      await client.query(
        "insert into storage.objects (bucket_id, name, owner) values ('kyc-documents', $1, $2)",
        [path, owner.userId],
      );

      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: owner.userId, session_id: owner.sessionId, role: "authenticated" }),
      ]);
      const ownRead = await client.query(
        "select name from storage.objects where bucket_id = 'kyc-documents' and name = $1",
        [path],
      );
      expect(ownRead.rows).toHaveLength(1);

      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: stranger.userId, session_id: stranger.sessionId, role: "authenticated" }),
      ]);
      const strangerRead = await client.query(
        "select name from storage.objects where bucket_id = 'kyc-documents' and name = $1",
        [path],
      );
      expect(strangerRead.rows).toHaveLength(0);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
});
