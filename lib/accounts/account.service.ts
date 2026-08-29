import type { Result } from "@/lib/shared/result";
import type { AppError } from "@/lib/shared/errors/app-error";
import type { AccountRepository } from "@/lib/accounts/account.repository";
import type { AccountSummary } from "@/lib/accounts/account.types";

export class AccountService {
  constructor(private readonly accounts: AccountRepository) {}

  getOwnAccount(userId: string): Promise<Result<AccountSummary, AppError>> {
    return this.accounts.findOwnAccount(userId);
  }
}
