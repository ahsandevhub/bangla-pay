import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { type Result, ok, err } from "@/lib/shared/result";
import { type AppError, appError, defaultMessageForErrorCode } from "@/lib/shared/errors/app-error";
import { appErrorFromSupabaseError } from "@/lib/shared/errors/from-supabase-error";
import { poishaToRpcNumber, rpcNumberToPoisha } from "@/lib/shared/domain/money";
import type { MoneyRequest, RequestSettlement } from "@/lib/requests/request.types";

export interface RequestRepository {
  create(params: {
    payerWallet: string;
    amountPoisha: bigint;
    note: string | null;
  }): Promise<Result<MoneyRequest, AppError>>;

  accept(params: {
    requestId: string;
    deviceToken: string;
  }): Promise<Result<RequestSettlement, AppError>>;

  decline(params: { requestId: string }): Promise<Result<MoneyRequest, AppError>>;
}

export class SupabaseRequestRepository implements RequestRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async create(params: {
    payerWallet: string;
    amountPoisha: bigint;
    note: string | null;
  }): Promise<Result<MoneyRequest, AppError>> {
    const { data, error } = await this.client.rpc("create_request", {
      p_payer_wallet: params.payerWallet,
      p_amount_poisha: poishaToRpcNumber(params.amountPoisha),
      // create_request's p_note is a nullable `text` param in Postgres, but
      // Supabase's generated Args type doesn't reflect RPC arg nullability.
      p_note: params.note as string,
    });

    if (error) {
      return err(appErrorFromSupabaseError(error));
    }
    if (!data) {
      return err(appError("INTERNAL_ERROR", defaultMessageForErrorCode("INTERNAL_ERROR")));
    }

    return ok(toMoneyRequest(data));
  }

  async accept(params: {
    requestId: string;
    deviceToken: string;
  }): Promise<Result<RequestSettlement, AppError>> {
    const { data, error } = await this.client.rpc("settle_request", {
      p_request_id: params.requestId,
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
      amountPoisha: rpcNumberToPoisha(row.amount_poisha),
      createdAt: row.created_at,
      replayed: row.replayed,
    });
  }

  async decline(params: { requestId: string }): Promise<Result<MoneyRequest, AppError>> {
    const { data, error } = await this.client.rpc("decline_request", {
      p_request_id: params.requestId,
    });

    if (error) {
      return err(appErrorFromSupabaseError(error));
    }
    if (!data) {
      return err(appError("INTERNAL_ERROR", defaultMessageForErrorCode("INTERNAL_ERROR")));
    }

    return ok(toMoneyRequest(data));
  }
}

function toMoneyRequest(row: {
  id: string;
  requester_account_id: string;
  payer_account_id: string;
  amount_poisha: number;
  note: string | null;
  status: Database["public"]["Enums"]["request_status"];
  settlement_transaction_id: string | null;
  expires_at: string;
  created_at: string;
}): MoneyRequest {
  return {
    id: row.id,
    requesterAccountId: row.requester_account_id,
    payerAccountId: row.payer_account_id,
    amountPoisha: rpcNumberToPoisha(row.amount_poisha),
    note: row.note,
    status: row.status,
    settlementTransactionId: row.settlement_transaction_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}
