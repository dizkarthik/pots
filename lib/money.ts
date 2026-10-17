// Money is stored as an integer number of paise (never floats), but the app
// works in WHOLE RUPEES: users enter whole amounts and every amount is shown
// without decimals. Stored values are therefore always multiples of 100.

const AMOUNT_RE = /^\d+$/;

/**
 * Parses user input ("1,234", "₹ 500") into integer paise using string
 * arithmetic only. Returns null for anything that isn't a non-negative whole
 * number of rupees (decimals are rejected).
 */
export function toPaise(input: string): number | null {
  const cleaned = input.trim().replace(/^₹\s*/, "").replace(/,/g, "");
  if (!AMOUNT_RE.test(cleaned)) return null;
  const total = Number(cleaned) * 100;
  return Number.isSafeInteger(total) ? total : null;
}

/** Paise → whole-rupee string for form inputs (123400 → "1234"). */
export function paiseToInput(paise: number): string {
  return String(Math.round(paise / 100));
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * 12345600 → "₹1,23,456". Whole rupees only. Division by 100 is display-only;
 * the result is never fed back into arithmetic.
 */
export function formatINR(paise: number): string {
  return inr.format(paise / 100);
}

const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 1718000000 paise → "₹1.7Cr"; for chart axes where space is tight. */
export function formatINRCompact(paise: number): string {
  return inrCompact.format(paise / 100);
}
