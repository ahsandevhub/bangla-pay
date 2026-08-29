import { describe, expect, it, vi } from "vitest";
import { RequestService } from "@/lib/requests/request.service";
import type { RequestRepository } from "@/lib/requests/request.repository";
import type { MoneyRequest, RequestSettlement } from "@/lib/requests/request.types";
import { ok, err } from "@/lib/shared/result";
import { appError } from "@/lib/shared/errors/app-error";

class FakeRequestRepository implements RequestRepository {
  create = vi.fn<RequestRepository["create"]>();
  accept = vi.fn<RequestRepository["accept"]>();
  decline = vi.fn<RequestRepository["decline"]>();
}

const sampleRequest: MoneyRequest = {
  id: "req-1",
  requesterAccountId: "acct-requester",
  payerAccountId: "acct-payer",
  amountPoisha: 120000n,
  note: null,
  status: "PENDING",
  settlementTransactionId: null,
  expiresAt: "2026-08-30T00:00:00Z",
  createdAt: "2026-08-29T00:00:00Z",
};

describe("RequestService.create", () => {
  it("parses the amount and forwards poisha to the repository", async () => {
    const repo = new FakeRequestRepository();
    repo.create.mockResolvedValue(ok(sampleRequest));
    const service = new RequestService(repo);

    const result = await service.create({
      payerWallet: "+8801811000002",
      amount: "1200",
      note: null,
    });

    expect(result).toEqual(ok(sampleRequest));
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ amountPoisha: 120000n }),
    );
  });

  it("rejects an invalid amount without calling the repository", async () => {
    const repo = new FakeRequestRepository();
    const service = new RequestService(repo);

    const result = await service.create({ payerWallet: "+8801811000002", amount: "-5", note: null });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_AMOUNT");
    }
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe("RequestService.accept / decline", () => {
  it("passes accept through to the repository", async () => {
    const repo = new FakeRequestRepository();
    const settlement: RequestSettlement = {
      transactionId: "tx-1",
      amountPoisha: 120000n,
      createdAt: "2026-08-29T00:00:00Z",
      replayed: false,
    };
    repo.accept.mockResolvedValue(ok(settlement));
    const service = new RequestService(repo);

    const result = await service.accept({ requestId: "req-1", deviceToken: "device-token" });

    expect(result).toEqual(ok(settlement));
    expect(repo.accept).toHaveBeenCalledWith({ requestId: "req-1", deviceToken: "device-token" });
  });

  it("passes through a decline error", async () => {
    const repo = new FakeRequestRepository();
    const error = appError("REQUEST_NOT_PENDING", "This request has already been settled.");
    repo.decline.mockResolvedValue(err(error));
    const service = new RequestService(repo);

    const result = await service.decline({ requestId: "req-1" });

    expect(result).toEqual(err(error));
  });
});
