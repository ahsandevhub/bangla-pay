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

    // RLS (ledger_entries_select_own_account) already scopes this to the
    // caller's own account -- no need to resolve/pass an account id here.
    let query = this.client
      .from("ledger_entries")
      .select("id, transaction_id, direction, amount_poisha, balance_after_poisha, created_at")
      .order("id", { ascending: false })
      .limit(HISTORY_PAGE_SIZE + 1);

    if (cursorId !== null) {
      query = query.lt("id", cursorId);
    }

    const { data, error } = await query;
    if (error) {
      return err(appErrorFromSupabaseError(error));
    }

    const rows = data ?? [];
    const hasMore = rows.length > HISTORY_PAGE_SIZE;
    const page = hasMore ? rows.slice(0, HISTORY_PAGE_SIZE) : rows;
    const lastRow = page.at(-1);

    return ok({
      items: page.map((row) => ({
        ledgerEntryId: row.id,
        transactionId: row.transaction_id,
        direction: row.direction,
        amountPoisha: rpcNumberToPoisha(row.amount_poisha),
        balanceAfterPoisha: rpcNumberToPoisha(row.balance_after_poisha),
        createdAt: row.created_at,
      })),
      nextCursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
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
