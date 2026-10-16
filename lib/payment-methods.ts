/*
 * "Paid via" rules:
 * - A locker WITH sub payment methods (e.g. HDFC → "HDFC Card", "HDFC UPI")
 *   is offered only through those sub methods, never as plain "HDFC".
 * - A locker WITHOUT sub methods (Millennia, Amazon Pay, Cash, Folders) is
 *   offered as itself: the expense is paid directly from the locker.
 * Every expense therefore records the locker it was paid from, plus the exact
 * sub method when there is one.
 *
 * Options are encoded as "m:<paymentMethodId>" or "a:<accountId>".
 */

export interface PaidViaLocker {
  id: string;
  bank: string;
}

export interface PaidViaMethod {
  id: string;
  name: string;
  accountId: string;
}

export interface PaidViaOption {
  value: string;
  label: string;
  accountId: string;
  paymentMethodId: string | null;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const PAID_VIA_RE = new RegExp(`^(m|a):(${UUID})$`, "i");

const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label);

export function buildPaidViaOptions(lockers: readonly PaidViaLocker[], methods: readonly PaidViaMethod[]): PaidViaOption[] {
  return lockers.flatMap((locker): PaidViaOption[] => {
    const subs = methods.filter((m) => m.accountId === locker.id);
    if (subs.length === 0) {
      return [{ value: `a:${locker.id}`, label: locker.bank, accountId: locker.id, paymentMethodId: null }];
    }
    return subs.map((m) => ({ value: `m:${m.id}`, label: m.name, accountId: locker.id, paymentMethodId: m.id }));
  }).sort(byLabel);
}

export function parsePaidVia(value: string): { kind: "method" | "account"; id: string } | null {
  const match = PAID_VIA_RE.exec(value);
  if (!match) return null;
  return { kind: match[1].toLowerCase() === "m" ? "method" : "account", id: match[2].toLowerCase() };
}

/** The option value for an existing expense. */
export function paidViaValue(expense: { accountId: string; paymentMethodId: string | null }): string {
  return expense.paymentMethodId ? `m:${expense.paymentMethodId}` : `a:${expense.accountId}`;
}
