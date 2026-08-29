import { describe, expect, it } from "vitest";
import { transactionHistoryQuerySchema, transferRequestSchema } from "@/lib/money/money.schema";

describe("transferRequestSchema", () => {
  const valid = {
    destinationWallet: "+8801711000001",
    amount: "2500.50",
    idempotencyKey: "cccccccc-0000-4000-8000-000000000001",
  };

  it("accepts a valid transfer request without a note", () => {
    expect(transferRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an optional note", () => {
    expect(transferRequestSchema.safeParse({ ...valid, note: "lunch" }).success).toBe(true);
  });

  it.each(["01711000001", "+880171100000", "+88017110000012", "not-a-phone"])(
    "rejects a malformed destination wallet (%s)",
    (destinationWallet) => {
      expect(transferRequestSchema.safeParse({ ...valid, destinationWallet }).success).toBe(false);
    },
  );

  it.each(["-100", "100.123", "1e10", "abc"])("rejects a malformed amount (%s)", (amount) => {
    expect(transferRequestSchema.safeParse({ ...valid, amount }).success).toBe(false);
  });

  it("accepts the shape of a zero amount -- rejecting zero is Money.parse's job, not this schema's", () => {
    expect(transferRequestSchema.safeParse({ ...valid, amount: "0" }).success).toBe(true);
  });

  it("rejects a non-UUID idempotency key", () => {
    expect(
      transferRequestSchema.safeParse({ ...valid, idempotencyKey: "not-a-uuid" }).success,
    ).toBe(false);
  });

  it("rejects a note longer than 280 characters", () => {
    expect(transferRequestSchema.safeParse({ ...valid, note: "a".repeat(281) }).success).toBe(false);
  });
});

describe("transactionHistoryQuerySchema", () => {
  it("accepts no cursor", () => {
    expect(transactionHistoryQuerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts an opaque cursor string", () => {
    expect(transactionHistoryQuerySchema.safeParse({ cursor: "MTIz" }).success).toBe(true);
  });

  it("rejects an empty-string cursor", () => {
    expect(transactionHistoryQuerySchema.safeParse({ cursor: "" }).success).toBe(false);
  });
});
