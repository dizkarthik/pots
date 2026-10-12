// Money is always an integer number of paise. Never use floats for amounts.

const AMOUNT_RE = /^(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Parses user input ("1,234.5", "₹ 500", "99.99") into integer paise using
 * string arithmetic only. Returns null for anything that isn't a
 * non-negative amount with at most two decimals.
 */
export function toPaise(input: string): number | null {
  const cleaned = input.trim().replace(/^₹\s*/, "").replace(/,/g, "");
  const match = AMOUNT_RE.exec(cleaned);
  if (!match) return null;
  const rupees = Number(match[1]);
  const paise = Number((match[2] ?? "").padEnd(2, "0"));
  const total = rupees * 100 + paise;
  return Number.isSafeInteger(total) ? total : null;
}

/** Paise → plain decimal string for form inputs ("123456.5" → "1234.56"). */
export function paiseToInput(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const rest = abs % 100;
  return rest === 0 ? `${sign}${rupees}` : `${sign}${rupees}.${String(rest).padStart(2, "0")}`;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * 12345600 → "₹1,23,456.00". Division by 100 is display-only; the result is
 * never fed back into arithmetic.
 */
export function formatINR(paise: number, { whole = false }: { whole?: boolean } = {}): string {
  return (whole ? inrWhole : inr).format(paise / 100);
}
