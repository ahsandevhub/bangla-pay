import { InvalidMoneyError, Money } from "@/lib/shared/domain/money";
import { type Result, err } from "@/lib/shared/result";
import { type AppError, appError, defaultMessageForErrorCode } from "@/lib/shared/errors/app-error";
import type { MoneyRepository } from "@/lib/money/money.repository";
import type { TransactionHistoryPage, TransferOutcome } from "@/lib/money/money.types";

export class MoneyService {
  constructor(private readonly money: MoneyRepository) {}

  async transfer(params: {
    destinationWallet: string;
    amount: string;
    idempotencyKey: string;
    note: string | null;
    deviceToken: string;
  }): Promise<Result<TransferOutcome, AppError>> {
    let amountPoisha: bigint;
    try {
      amountPoisha = Money.parse(params.amount).toPoisha();
    } catch (error) {
      if (error instanceof InvalidMoneyError) {
        return err(appError("INVALID_AMOUNT", defaultMessageForErrorCode("INVALID_AMOUNT")));
      }
      throw error;
    }

    return this.money.transfer({
      destinationWallet: params.destinationWallet,
      amountPoisha,
      idempotencyKey: params.idempotencyKey,
      note: params.note,
      deviceToken: params.deviceToken,
    });
  }

  listTransactionHistory(params: {
    cursor: string | null;
  }): Promise<Result<TransactionHistoryPage, AppError>> {
    return this.money.listTransactionHistory(params);
  }
}
