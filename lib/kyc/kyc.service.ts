import { deriveNidFingerprint } from "@/lib/auth/credentials";
import type { Result } from "@/lib/shared/result";
import type { AppError } from "@/lib/shared/errors/app-error";
import type { KycRepository } from "@/lib/kyc/kyc.repository";
import type { KycVerificationOutcome, UploadUrlResult } from "@/lib/kyc/kyc.types";

export class KycService {
  constructor(private readonly kyc: KycRepository) {}

  requestUploadUrl(userId: string, fileExtension: string): Promise<Result<UploadUrlResult, AppError>> {
    return this.kyc.createUploadUrl(userId, fileExtension);
  }

  verify(params: {
    documentPath: string;
    nidNumber: string;
    dateOfBirth: string;
    banglaName?: string;
    englishName?: string;
  }): Promise<Result<KycVerificationOutcome, AppError>> {
    return this.kyc.verify({
      documentPath: params.documentPath,
      nidNumber: params.nidNumber,
      dateOfBirth: params.dateOfBirth,
      banglaName: params.banglaName ?? null,
      englishName: params.englishName ?? null,
      nidFingerprint: deriveNidFingerprint(params.nidNumber),
    });
  }
}
