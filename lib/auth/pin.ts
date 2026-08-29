// PIN strength rules, per docs/ARCHITECTURE.md: exactly four ASCII digits,
// not all-repeated, not a sequential run (ascending or descending), not the
// two well-known "clock" patterns, and not the phone's own last four digits.
const PIN_SHAPE_PATTERN = /^\d{4}$/;
const BANNED_PINS = new Set(["2580", "0852"]);

export class WeakPinError extends Error {
  constructor(public readonly reason: string) {
    super(`Weak PIN: ${reason}`);
    this.name = "WeakPinError";
  }
}

function isRepeatedDigits(pin: string): boolean {
  return new Set(pin).size === 1;
}

function isSequentialRun(pin: string): boolean {
  const digits = pin.split("").map(Number);
  const ascending = digits.every((digit, i) => i === 0 || digit === digits[i - 1] + 1);
  const descending = digits.every((digit, i) => i === 0 || digit === digits[i - 1] - 1);
  return ascending || descending;
}

export function assertPinIsStrong(pin: string, canonicalPhone: string): void {
  if (!PIN_SHAPE_PATTERN.test(pin)) {
    throw new WeakPinError("must be exactly four digits");
  }
  if (isRepeatedDigits(pin)) {
    throw new WeakPinError("repeated digits");
  }
  if (isSequentialRun(pin)) {
    throw new WeakPinError("sequential digits");
  }
  if (BANNED_PINS.has(pin)) {
    throw new WeakPinError("commonly guessed PIN");
  }
  if (pin === canonicalPhone.slice(-4)) {
    throw new WeakPinError("matches the phone number");
  }
}
