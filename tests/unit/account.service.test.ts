import { describe, expect, it } from "vitest";
import { AccountService } from "@/lib/accounts/account.service";
import type { AccountRepository } from "@/lib/accounts/account.repository";
import type { AccountSummary } from "@/lib/accounts/account.types";
import { ok, err, type Result } from "@/lib/shared/result";
import { type AppError, appError } from "@/lib/shared/errors/app-error";

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly result: Result<AccountSummary, AppError>) {}

  async findOwnAccount() {
    return this.result;
  }
}

describe("AccountService.getOwnAccount", () => {
  it("passes through a found account", async () => {
    const summary: AccountSummary = {
      walletNumber: "+8801711000001",
      balancePoisha: 250000n,
      status: "ACTIVE",
    };
    const service = new AccountService(new FakeAccountRepository(ok(summary)));

    const result = await service.getOwnAccount("11111111-1111-1111-1111-111111111111");

    expect(result).toEqual(ok(summary));
  });

  it("passes through a repository error", async () => {
    const error = appError("ACCOUNT_NOT_FOUND", "Account not found.");
    const service = new AccountService(new FakeAccountRepository(err(error)));

    const result = await service.getOwnAccount("11111111-1111-1111-1111-111111111111");

    expect(result).toEqual(err(error));
  });
});
