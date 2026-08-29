import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { type Result, ok, err } from "@/lib/shared/result";
import { type AppError, appError, defaultMessageForErrorCode } from "@/lib/shared/errors/app-error";
import { appErrorFromSupabaseError } from "@/lib/shared/errors/from-supabase-error";
import { rpcNumberToPoisha } from "@/lib/shared/domain/money";
import type { AccountSummary } from "@/lib/accounts/account.types";

// Repositories are the only TypeScript modules that create Supabase clients
// or invoke RPC/database operations, per docs/ARCHITECTURE.md's Modular
// Boundaries. Services never see a SupabaseClient directly.
export interface AccountRepository {
  findOwnAccount(userId: string): Promise<Result<AccountSummary, AppError>>;
}

export class SupabaseAccountRepository implements AccountRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findOwnAccount(userId: string): Promise<Result<AccountSummary, AppError>> {
    const { data, error } = await this.client
      .from("accounts")
      .select("wallet_number, balance_poisha, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return err(appErrorFromSupabaseError(error));
    }

    // RLS requires both ownership and an active session (accounts_select_own),
    // so a null row here means either "no wallet yet" (still PENDING_KYC) or
    // "session no longer active" -- both surface the same way to callers.
    if (!data) {
      return err(appError("ACCOUNT_NOT_FOUND", defaultMessageForErrorCode("ACCOUNT_NOT_FOUND")));
    }

    return ok({
      walletNumber: data.wallet_number,
      balancePoisha: rpcNumberToPoisha(data.balance_poisha),
      status: data.status,
    });
  }
}
