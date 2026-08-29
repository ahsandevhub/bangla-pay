// Bangladesh mobile numbers only, per docs/ARCHITECTURE.md. Accepts either
// local (01[3-9]XXXXXXXX) or already-canonical (+8801[3-9]XXXXXXXX) form and
// normalizes both to the canonical +8801XXXXXXXXX form profiles.phone stores.
const LOCAL_PHONE_PATTERN = /^01[3-9]\d{8}$/;
const CANONICAL_PHONE_PATTERN = /^\+8801[3-9]\d{8}$/;

export class InvalidPhoneError extends Error {
  constructor(public readonly input: string) {
    super(`Invalid Bangladeshi phone number: "${input}"`);
    this.name = "InvalidPhoneError";
  }
}

export function normalizePhone(input: string): string {
  const trimmed = input.trim();

  if (CANONICAL_PHONE_PATTERN.test(trimmed)) {
    return trimmed;
  }
  if (LOCAL_PHONE_PATTERN.test(trimmed)) {
    return `+88${trimmed}`;
  }
  throw new InvalidPhoneError(input);
}

export { CANONICAL_PHONE_PATTERN };
