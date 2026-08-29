import { describe, expect, it, vi } from "vitest";
import { MoneyService } from "@/lib/money/money.service";
import type { MoneyRepository } from "@/lib/money/money.repository";
import type { TransactionHistoryPage, TransferOutcome } from "@/lib/money/money.types";
import { ok, err } from "@/lib/shared/result";
import { appError } from "@/lib/shared/errors/app-error";

class FakeMoneyRepository implements MoneyRepository {
  transfer = vi.fn<MoneyRepository["transfer"]>();
  listTransactionHistory = vi.fn<MoneyRepository["listTransactionHistory"]>();
}

const transferParams = {
  destinationWallet: "+8801811000002",
  idempotencyKey: "cccccccc-0000-0000-0000-000000000001",
  note: null,
  deviceToken: "device-token",
};

describe("MoneyService.transfer", () => {
  it("parses the amount and forwards poisha to the repository", async () => {
    const repo = new FakeMoneyRepository();
    const outcome: TransferOutcome = {
      transactionId: "tx-1",
      destinationWallet: transferParams.destinationWallet,
      amountPoisha: 250050n,
      note: null,
      createdAt: "2026-08-29T00:00:00Z",
      replayed: false,
    };
    repo.transfer.mockResolvedValue(ok(outcome));
    const service = new MoneyService(repo);

    const result = await service.transfer({ ...transferParams, amount: "2500.50" });

    expect(result).toEqual(ok(outcome));
    expect(repo.transfer).toHaveBeenCalledWith(
      expect.objectContaining({ amountPoisha: 250050n }),
    );
  });

  it("rejects an invalid amount without calling the repository", async () => {
    const repo = new FakeMoneyRepository();
    const service = new MoneyService(repo);

    const result = await service.transfer({ ...transferParams, amount: "0" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_AMOUNT");
    }
    expect(repo.transfer).not.toHaveBeenCalled();
  });

  it("passes through a repository error", async () => {
    const repo = new FakeMoneyRepository();
    const error = appError("INSUFFICIENT_FUNDS", "Insufficient balance.");
    repo.transfer.mockResolvedValue(err(error));
    const service = new MoneyService(repo);

    const result = await service.transfer({ ...transferParams, amount: "100" });

    expect(result).toEqual(err(error));
  });
});

describe("MoneyService.listTransactionHistory", () => {
  it("passes through the repository's page", async () => {
    const repo = new FakeMoneyRepository();
    const page: TransactionHistoryPage = { items: [], nextCursor: null };
    repo.listTransactionHistory.mockResolvedValue(ok(page));
    const service = new MoneyService(repo);

    const result = await service.listTransactionHistory({ cursor: null });

    expect(result).toEqual(ok(page));
    expect(repo.listTransactionHistory).toHaveBeenCalledWith({ cursor: null });
  });
});
