import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { type Result, ok, err } from "@/lib/shared/result";
import {
  type AppError,
  appError,
  defaultMessageForErrorCode,
  isAppErrorCode,
} from "@/lib/shared/errors/app-error";
import { appErrorFromSupabaseError } from "@/lib/shared/errors/from-supabase-error";
import { rpcNumberToPoisha } from "@/lib/shared/domain/money";
import type { KycVerificationOutcome, UploadUrlResult } from "@/lib/kyc/kyc.types";

const KYC_BUCKET = "kyc-documents";

export interface KycRepository {
  createUploadUrl(userId: string, fileExtension: string): Promise<Result<UploadUrlResult, AppError>>;

  verify(params: {
    documentPath: string;
    nidNumber: string;
    dateOfBirth: string;
    banglaName: string | null;
    englishName: string | null;
    nidFingerprint: string;
  }): Promise<Result<KycVerificationOutcome, AppError>>;
}

export class SupabaseKycRepository implements KycRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async createUploadUrl(userId: string, fileExtension: string): Promise<Result<UploadUrlResult, AppError>> {
    // User-scoped path: storage RLS (kyc_documents_owner_*) requires the
    // first path segment to equal auth.uid().
    const path = `${userId}/nid-front-${Date.now()}.${fileExtension}`;

    const { data, error } = await this.client.storage.from(KYC_BUCKET).createSignedUploadUrl(path);
    if (error) {
      return err(appError("INTERNAL_ERROR", defaultMessageForErrorCode("INTERNAL_ERROR")));
    }

    return ok({ path: data.path, signedUrl: data.signedUrl, token: data.token });
  }

  async verify(params: {
    documentPath: string;
    nidNumber: string;
    dateOfBirth: string;
    banglaName: string | null;
    englishName: string | null;
    nidFingerprint: string;
  }): Promise<Result<KycVerificationOutcome, AppError>> {
    const { data, error } = await this.client.rpc("activate_account_after_kyc", {
      p_document_path: params.documentPath,
      p_submitted_nid_number: params.nidNumber,
      p_submitted_date_of_birth: params.dateOfBirth,
      // The generated Args type doesn't reflect that these Postgres params
      // are nullable text -- same codegen gap noted in money/request repositories.
      p_submitted_bangla_name: params.banglaName as string,
      p_submitted_english_name: params.englishName as string,
      p_nid_fingerprint: params.nidFingerprint,
    });

    if (error) return err(appErrorFromSupabaseError(error));

    const row = data?.[0];
    if (!row) return err(appError("INTERNAL_ERROR", defaultMessageForErrorCode("INTERNAL_ERROR")));

    // KYC_NO_MATCH and NID_ALREADY_USED come back as a REJECTED result row
    // rather than a raised exception -- see the comment on
    // activate_account_after_kyc in supabase/migrations/20260829120700_money_functions.sql.
    if (row.status === "REJECTED") {
      const failureCode = row.failure_code;
      if (failureCode && isAppErrorCode(failureCode)) {
        return err(appError(failureCode, defaultMessageForErrorCode(failureCode)));
      }
      return err(appError("INTERNAL_ERROR", defaultMessageForErrorCode("INTERNAL_ERROR")));
    }

    if (!row.account_id || !row.wallet_number || row.balance_poisha === null) {
      return err(appError("INTERNAL_ERROR", defaultMessageForErrorCode("INTERNAL_ERROR")));
    }

    return ok({
      accountId: row.account_id,
      walletNumber: row.wallet_number,
      balancePoisha: rpcNumberToPoisha(row.balance_poisha),
    });
  }
}
