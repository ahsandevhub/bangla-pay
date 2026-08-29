import { describe, expect, it } from "vitest";
import { InvalidMoneyError, Money, poishaToRpcNumber, rpcNumberToPoisha } from "@/lib/shared/domain/money";

describe("Money.parse", () => {
  it("parses a whole-taka amount", () => {
    expect(Money.parse("2500").toPoisha()).toBe(250000n);
  });

  it("parses a two-decimal amount", () => {
    expect(Money.parse("2500.50").toPoisha()).toBe(250050n);
  });

  it("parses a single-decimal amount by treating it as tenths", () => {
    expect(Money.parse("10.5").toPoisha()).toBe(1050n);
  });

  it("parses the smallest possible amount (one poisha)", () => {
    expect(Money.parse("0.01").toPoisha()).toBe(1n);
  });

  it("trims surrounding whitespace", () => {
    expect(Money.parse("  100  ").toPoisha()).toBe(10000n);
  });

  it.each(["0", "0.0", "0.00"])("rejects zero (%s)", (input) => {
    expect(() => Money.parse(input)).toThrow(InvalidMoneyError);
  });

  it.each(["-1", "-100.50", "-0.01"])("rejects negative amounts (%s)", (input) => {
    expect(() => Money.parse(input)).toThrow(InvalidMoneyError);
  });

  it.each(["1e10", "1E3", "1e-5"])("rejects exponent notation (%s)", (input) => {
    expect(() => Money.parse(input)).toThrow(InvalidMoneyError);
  });

  it.each(["100.123", "1.999"])("rejects more than two decimal places (%s)", (input) => {
    expect(() => Money.parse(input)).toThrow(InvalidMoneyError);
  });

  it.each(["", "abc", "10.", ".50", "10,000", "10 000", "+100", "NaN", "Infinity"])(
    "rejects malformed input (%s)",
    (input) => {
      expect(() => Money.parse(input)).toThrow(InvalidMoneyError);
    },
  );

  it("does not lose precision on large amounts that would drift as a float", () => {
    // 90071992547409.91 is beyond Number.MAX_SAFE_INTEGER / 100 when the
    // fractional part is included -- a float parse would silently round this.
    const money = Money.parse("90071992547409.91");
    expect(money.toPoisha()).toBe(9007199254740991n);
    expect(money.toDecimalString()).toBe("90071992547409.91");
  });

  it("round-trips many decimal values through parse -> toDecimalString without drift", () => {
    const samples = ["0.01", "0.10", "0.99", "1.01", "9999999.99", "123456789.12"];
    for (const sample of samples) {
      expect(Money.parse(sample).toDecimalString()).toBe(sample);
    }
  });
});

describe("Money.fromPoisha / toDecimalString", () => {
  it("formats a positive amount", () => {
    expect(Money.fromPoisha(250050n).toDecimalString()).toBe("2500.50");
  });

  it("formats zero", () => {
    expect(Money.fromPoisha(0n).toDecimalString()).toBe("0.00");
  });

  it("formats a negative amount (the system account's balance)", () => {
    expect(Money.fromPoisha(-10000000n).toDecimalString()).toBe("-100000.00");
  });

  it("pads a single-digit poisha remainder", () => {
    expect(Money.fromPoisha(101n).toDecimalString()).toBe("1.01");
    expect(Money.fromPoisha(105n).toDecimalString()).toBe("1.05");
  });
});

describe("Money arithmetic", () => {
  it("adds two amounts", () => {
    expect(Money.fromPoisha(100n).add(Money.fromPoisha(250n)).toPoisha()).toBe(350n);
  });

  it("subtracts two amounts, allowing negative results", () => {
    expect(Money.fromPoisha(100n).subtract(Money.fromPoisha(250n)).toPoisha()).toBe(-150n);
  });

  it("reports zero/positive/negative correctly", () => {
    expect(Money.fromPoisha(0n).isZero()).toBe(true);
    expect(Money.fromPoisha(1n).isPositive()).toBe(true);
    expect(Money.fromPoisha(-1n).isNegative()).toBe(true);
  });

  it("compares two amounts", () => {
    expect(Money.fromPoisha(100n).compare(Money.fromPoisha(200n))).toBe(-1);
    expect(Money.fromPoisha(200n).compare(Money.fromPoisha(100n))).toBe(1);
    expect(Money.fromPoisha(100n).compare(Money.fromPoisha(100n))).toBe(0);
  });

  it("reports equality independent of instance", () => {
    expect(Money.parse("10.50").equals(Money.fromPoisha(1050n))).toBe(true);
  });
});

describe("RPC number boundary conversions", () => {
  it("round-trips a typical amount", () => {
    expect(rpcNumberToPoisha(poishaToRpcNumber(250050n))).toBe(250050n);
  });

  it("round-trips a negative amount", () => {
    expect(rpcNumberToPoisha(poishaToRpcNumber(-10000000n))).toBe(-10000000n);
  });

  it("throws rather than silently truncating a value beyond the safe integer range", () => {
    const tooLarge = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
    expect(() => poishaToRpcNumber(tooLarge)).toThrow(RangeError);
  });
});
