import { describe, expect, it } from "vitest";
import { createRequestSchema, requestIdParamSchema } from "@/lib/requests/request.schema";

describe("createRequestSchema", () => {
  const valid = { payerWallet: "+8801811000002", amount: "1200" };

  it("accepts a valid request", () => {
    expect(createRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a malformed payer wallet", () => {
    expect(createRequestSchema.safeParse({ ...valid, payerWallet: "01811000002" }).success).toBe(false);
  });

  it("rejects a malformed amount", () => {
    expect(createRequestSchema.safeParse({ ...valid, amount: "1.234" }).success).toBe(false);
  });

  it("accepts the shape of a zero amount -- rejecting zero is Money.parse's job, not this schema's", () => {
    expect(createRequestSchema.safeParse({ ...valid, amount: "0" }).success).toBe(true);
  });

  it("rejects a note longer than 280 characters", () => {
    expect(createRequestSchema.safeParse({ ...valid, note: "a".repeat(281) }).success).toBe(false);
  });
});

describe("requestIdParamSchema", () => {
  it("accepts a UUID", () => {
    expect(
      requestIdParamSchema.safeParse({ id: "cccccccc-0000-4000-8000-000000000001" }).success,
    ).toBe(true);
  });

  it("rejects a non-UUID", () => {
    expect(requestIdParamSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
  });
});
