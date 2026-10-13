/** Inserted by migration 0001; users can add more from the expense form. */
export const PRESET_PAYMENT_METHODS = ["Cash", "UPI", "HDFC Credit", "RuPay Credit", "Debit Card"] as const;

/** Trims and collapses inner whitespace so "  Jupiter   Card " is stored as "Jupiter Card". */
export function normalizePaymentMethodName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
