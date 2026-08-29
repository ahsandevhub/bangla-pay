import { InvalidMoneyError, Money } from "@/lib/shared/domain/money";
import { type Result, err } from "@/lib/shared/result";
import { type AppError, appError, defaultMessageForErrorCode } from "@/lib/shared/errors/app-error";
import type { RequestRepository } from "@/lib/requests/request.repository";
import type { MoneyRequest, RequestInboxItem, RequestSettlement } from "@/lib/requests/request.types";

export class RequestService {
  constructor(private readonly requests: RequestRepository) {}

  async create(params: {
    payerWallet: string;
    amount: string;
    note: string | null;
  }): Promise<Result<MoneyRequest, AppError>> {
    let amountPoisha: bigint;
    try {
      amountPoisha = Money.parse(params.amount).toPoisha();
    } catch (error) {
      if (error instanceof InvalidMoneyError) {
        return err(appError("INVALID_AMOUNT", defaultMessageForErrorCode("INVALID_AMOUNT")));
      }
      throw error;
    }

    return this.requests.create({
      payerWallet: params.payerWallet,
      amountPoisha,
      note: params.note,
    });
  }

  accept(params: { requestId: string; deviceToken: string }): Promise<Result<RequestSettlement, AppError>> {
    return this.requests.accept(params);
  }

  decline(params: { requestId: string }): Promise<Result<MoneyRequest, AppError>> {
    return this.requests.decline(params);
  }

  listPendingForPayer(): Promise<Result<RequestInboxItem[], AppError>> {
    return this.requests.listPendingForPayer();
  }
}
