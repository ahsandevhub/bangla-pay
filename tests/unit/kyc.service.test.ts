import { beforeAll, describe, expect, it, vi } from "vitest";
import { KycService } from "@/lib/kyc/kyc.service";
import type { KycRepository } from "@/lib/kyc/kyc.repository";
import type { KycVerificationOutcome, UploadUrlResult } from "@/lib/kyc/kyc.types";
import { ok, err } from "@/lib/shared/result";
import { appError } from "@/lib/shared/errors/app-error";

beforeAll(() => {
  process.env.APP_SECURITY_PEPPER = "test-pepper-not-a-real-secret";
});

class FakeKycRepository implements KycRepository {
  createUploadUrl = vi.fn<KycRepository["createUploadUrl"]>();
  verify = vi.fn<KycRepository["verify"]>();
}

describe("KycService.requestUploadUrl", () => {
  it("passes through to the repository", async () => {
    const repo = new FakeKycRepository();
    const uploadResult: UploadUrlResult = { path: "user-1/nid-front.jpg", signedUrl: "https://x", token: "tok" };
    repo.createUploadUrl.mockResolvedValue(ok(uploadResult));
    const service = new KycService(repo);

    const result = await service.requestUploadUrl("user-1", "jpg");

    expect(result).toEqual(ok(uploadResult));
    expect(repo.createUploadUrl).toHaveBeenCalledWith("user-1", "jpg");
  });
});

describe("KycService.verify", () => {
  it("derives the NID fingerprint deterministically and forwards it to the repository", async () => {
    const repo = new FakeKycRepository();
    const outcome: KycVerificationOutcome = {
      accountId: "acct-1",
      walletNumber: "+8801711000001",
      balancePoisha: 10000000n,
    };
    repo.verify.mockResolvedValue(ok(outcome));
    const service = new KycService(repo);

    const result = await service.verify({
      documentPath: "user-1/nid-front.jpg",
      nidNumber: "19920115123456701",
      dateOfBirth: "1992-01-15",
      englishName: "Ahsan Habib",
    });

    expect(result).toEqual(ok(outcome));
    expect(repo.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        nidNumber: "19920115123456701",
        banglaName: null,
        englishName: "Ahsan Habib",
        nidFingerprint: expect.any(String),
      }),
    );
  });

  it("derives the same fingerprint for the same NID number across calls", async () => {
    const repo = new FakeKycRepository();
    repo.verify.mockResolvedValue(
      ok({ accountId: "acct-1", walletNumber: "+8801711000001", balancePoisha: 10000000n }),
    );
    const service = new KycService(repo);

    await service.verify({
      documentPath: "a.jpg",
      nidNumber: "19920115123456701",
      dateOfBirth: "1992-01-15",
      englishName: "A",
    });
    await service.verify({
      documentPath: "b.jpg",
      nidNumber: "19920115123456701",
      dateOfBirth: "1992-01-15",
      englishName: "B",
    });

    const firstFingerprint = repo.verify.mock.calls[0][0].nidFingerprint;
    const secondFingerprint = repo.verify.mock.calls[1][0].nidFingerprint;
    expect(firstFingerprint).toBe(secondFingerprint);
  });

  it("passes through a repository error", async () => {
    const repo = new FakeKycRepository();
    const error = appError("KYC_NO_MATCH", "no match");
    repo.verify.mockResolvedValue(err(error));
    const service = new KycService(repo);

    const result = await service.verify({
      documentPath: "a.jpg",
      nidNumber: "19920115123456701",
      dateOfBirth: "1992-01-15",
      englishName: "A",
    });

    expect(result).toEqual(err(error));
  });
});
