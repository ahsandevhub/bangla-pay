import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { type Result, ok, err } from "@/lib/shared/result";
import { type AppError, appError, defaultMessageForErrorCode } from "@/lib/shared/errors/app-error";
import { appErrorFromSupabaseError } from "@/lib/shared/errors/from-supabase-error";
import { poishaToRpcNumber, rpcNumberToPoisha } from "@/lib/shared/domain/money";
import type { TransactionHistoryPage, TransferOutcome } from "@/lib/money/money.types";

const HISTORY_PAGE_SIZE = 20;

export interface MoneyRepository {
  transfer(params: {
    destinationWallet: string;
    amountPoisha: bigint;
    idempotencyKey: string;
    note: string | null;
    deviceToken: string;
  }): Promise<Result<TransferOutcome, AppError>>;

  listTransactionHistory(params: {
    cursor: string | null;
  }): Promise<Result<TransactionHistoryPage, AppError>>;
}

export class SupabaseMoneyRepository implements MoneyRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async transfer(params: {
    destinationWallet: string;
    amountPoisha: bigint;
    idempotencyKey: string;
    note: string | null;
    deviceToken: string;
  }): Promise<Result<TransferOutcome, AppError>> {
    const { data, error } = await this.client.rpc("transfer_money", {
      p_destination_wallet: params.destinationWallet,
      p_amount_poisha: poishaToRpcNumber(params.amountPoisha),
      p_idempotency_key: params.idempotencyKey,
      // transfer_money's p_note is a nullable `text` param in Postgres, but
      // Supabase's generated Args type doesn't reflect RPC arg nullability.
      p_note: params.note as string,
      p_transaction_type: "TRANSFER",
      p_device_token: params.deviceToken,
    });

    if (error) {
      return err(appErrorFromSupabaseError(error));
    }

    const row = data?.[0];
    if (!row) {
      return err(appError("INTERNAL_ERROR", defaultMessageForErrorCode("INTERNAL_ERROR")));
    }

    return ok({
      transactionId: row.transaction_id,
      destinationWallet: params.destinationWallet,
      amountPoisha: rpcNumberToPoisha(row.amount_poisha),
      note: row.note,
      createdAt: row.created_at,
      replayed: row.replayed,
    });
  }

  async listTransactionHistory(params: {
    cursor: string | null;
  }): Promise<Result<TransactionHistoryPage, AppError>> {
    let cursorId: number | null = null;
    if (params.cursor) {
      const decoded = decodeCursor(params.cursor);
      if (decoded === null) {
        return err(appError("CURSOR_INVALID", defaultMessageForErrorCode("CURSOR_INVALID")));
      }
      cursorId = decoded;
    }

    // A plain ledger_entries select (RLS-scoped to the caller's own account)
    // can't also show the transaction type or a counterparty wallet number --
    // accounts_select_own hides every other account. list_transaction_history
    // resolves the caller's account from auth.uid() itself and does that
    // enrichment join as SECURITY DEFINER, same pattern as create_request.
    const { data, error } = await this.client.rpc("list_transaction_history", {
      // The Postgres parameter is nullable; Supabase's generated Args type
      // doesn't reflect that (same as p_note elsewhere in this file).
      p_cursor: cursorId as number,
      p_limit: HISTORY_PAGE_SIZE + 1,
    });

    if (error) {
      return err(appErrorFromSupabaseError(error));
    }

    const rows = data ?? [];
    const hasMore = rows.length > HISTORY_PAGE_SIZE;
    const page = hasMore ? rows.slice(0, HISTORY_PAGE_SIZE) : rows;
    const lastRow = page.at(-1);

    return ok({
      items: page.map((row) => ({
        ledgerEntryId: row.ledger_entry_id,
        transactionId: row.transaction_id,
        type: row.type,
        direction: row.direction,
        amountPoisha: rpcNumberToPoisha(row.amount_poisha),
        balanceAfterPoisha: rpcNumberToPoisha(row.balance_after_poisha),
        note: row.note,
        counterpartyWalletNumber: row.counterparty_wallet_number,
        createdAt: row.created_at,
      })),
      nextCursor: hasMore && lastRow ? encodeCursor(lastRow.ledger_entry_id) : null,
    });
  }
}

// Opaque per docs/ARCHITECTURE.md's API contract -- callers must treat this
// as a token, not a number they can construct themselves.
function encodeCursor(ledgerEntryId: number): string {
  return Buffer.from(String(ledgerEntryId), "utf-8").toString("base64url");
}

function decodeCursor(cursor: string): number | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
    const id = Number(decoded);
    return Number.isInteger(id) && id >= 0 ? id : null;
  } catch {
    return null;
  }
}
