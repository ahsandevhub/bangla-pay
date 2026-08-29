// Money uses integer poisha exclusively (docs/ARCHITECTURE.md contract #1).
// Parsing goes string -> BigInt via manual digit arithmetic, never through a
// JS `number`, so there is no float rounding step for float drift to enter at.
// Exported so Zod DTO schemas at the route boundary (lib/money/money.schema.ts)
// can reject malformed amounts early with the exact same rule, instead of a
// second, potentially drifting regex.
export const DECIMAL_AMOUNT_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;

export class InvalidMoneyError extends Error {
  constructor(public readonly input: string) {
    super(`Invalid money amount: "${input}"`);
    this.name = "InvalidMoneyError";
  }
}

export class Money {
  private constructor(private readonly poishaValue: bigint) {}

  /** Wraps an already-known poisha amount (e.g. a value read back from the database). Allows zero/negative -- the hidden system account's balance is negative by design. */
  static fromPoisha(poisha: bigint): Money {
    return new Money(poisha);
  }

  /**
   * Parses a decimal BDT string from user input (e.g. a transfer amount
   * field). Rejects anything that isn't `<digits>` or `<digits>.<1-2 digits>`
   * -- no leading `+`/`-`, no exponent notation, no thousands separators --
   * and rejects zero, per docs/ARCHITECTURE.md's Phase 3 contract.
   */
  static parse(input: string): Money {
    const trimmed = input.trim();
    const match = DECIMAL_AMOUNT_PATTERN.exec(trimmed);
    if (!match) {
      throw new InvalidMoneyError(input);
    }

    const [, integerPart, fractionPart = ""] = match;
    const poisha = BigInt(integerPart) * 100n + BigInt(fractionPart.padEnd(2, "0"));

    if (poisha <= 0n) {
      throw new InvalidMoneyError(input);
    }

    return new Money(poisha);
  }

  toPoisha(): bigint {
    return this.poishaValue;
  }

  /** Canonical decimal string, e.g. "2500.50". Currency symbol/locale formatting belongs at the presentation boundary, not here. */
  toDecimalString(): string {
    const isNegative = this.poishaValue < 0n;
    const magnitude = isNegative ? -this.poishaValue : this.poishaValue;
    const integerPart = magnitude / 100n;
    const fractionPart = magnitude % 100n;
    const sign = isNegative ? "-" : "";
    return `${sign}${integerPart.toString()}.${fractionPart.toString().padStart(2, "0")}`;
  }

  add(other: Money): Money {
    return new Money(this.poishaValue + other.poishaValue);
  }

  subtract(other: Money): Money {
    return new Money(this.poishaValue - other.poishaValue);
  }

  isZero(): boolean {
    return this.poishaValue === 0n;
  }

  isPositive(): boolean {
    return this.poishaValue > 0n;
  }

  isNegative(): boolean {
    return this.poishaValue < 0n;
  }

  equals(other: Money): boolean {
    return this.poishaValue === other.poishaValue;
  }

  compare(other: Money): -1 | 0 | 1 {
    if (this.poishaValue < other.poishaValue) return -1;
    if (this.poishaValue > other.poishaValue) return 1;
    return 0;
  }
}

/**
 * Supabase's generated types map every `bigint` column/RPC-arg to
 * TypeScript `number` (see lib/supabase/database.types.ts) -- PostgREST's
 * JSON wire format has no bigint-safe representation here, so this is the
 * one unavoidable bigint -> number crossing, guarded by a safe-range check.
 * Use only when calling `.rpc()`/`.insert()`; never for arithmetic.
 */
export function poishaToRpcNumber(poisha: bigint): number {
  if (poisha > BigInt(Number.MAX_SAFE_INTEGER) || poisha < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError(`poisha value ${poisha} exceeds the safe integer range for RPC transport`);
  }
  return Number(poisha);
}

/** The inverse crossing, for values read back from a `.rpc()`/query response. */
export function rpcNumberToPoisha(value: number): bigint {
  return BigInt(value);
}
