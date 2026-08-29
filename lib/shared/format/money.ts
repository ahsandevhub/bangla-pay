// Client-safe money display helpers. No server-only imports, no DB access --
// safe to use from "use client" components. Money crosses the HTTP boundary
// as a JSON string (bigint -> string, per lib/shared/http/handler.ts), so
// every formatter here takes that string form, never a parsed JS number.

export type FormatLocale = "bn" | "en";

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** toLocaleString only converts the digits it formats itself -- a manually zero-padded string (e.g. a poisha fraction) needs this to match. */
export function toLocaleDigits(asciiDigits: string, locale: FormatLocale): string {
  if (locale !== "bn") return asciiDigits;
  return asciiDigits.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

export function formatNumber(n: number, locale: FormatLocale): string {
  return n.toLocaleString(locale === "en" ? "en-US" : "bn-BD");
}

/** e.g. "10000000" (poisha) -> "৳1,00,000.00" / "৳১,০০,০০০.০০". */
export function formatPoishaAsBdt(poishaText: string, locale: FormatLocale): string {
  const poisha = BigInt(poishaText);
  const isNegative = poisha < 0n;
  const magnitude = isNegative ? -poisha : poisha;
  const taka = formatNumber(Number(magnitude / 100n), locale);
  const fraction = toLocaleDigits((magnitude % 100n).toString().padStart(2, "0"), locale);
  return `${isNegative ? "-" : ""}৳${taka}.${fraction}`;
}
