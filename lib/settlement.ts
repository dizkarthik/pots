/**
 * Settlement: compare what each bank locker should hold (its Outstanding
 * balance) with what the bank actually shows, to plan salary-day transfers.
 *
 *   difference = outstanding − current
 *   > 0 → the locker is short: transfer that much in
 *   < 0 → the locker holds extra: that much can move out
 */

export interface SettlementLocker {
  id: string;
  bank: string;
  outstanding: number;
}

export type SettlementStatus = "short" | "extra" | "settled";

export function settlementDifference(outstanding: number, current: number | null): number | null {
  return current === null ? null : outstanding - current;
}

export function settlementStatus(difference: number): SettlementStatus {
  return difference > 0 ? "short" : difference < 0 ? "extra" : "settled";
}

/** Totals across lockers; current and difference only count lockers with a balance entered. */
export function settlementTotals(lockers: readonly SettlementLocker[], current: ReadonlyMap<string, number>) {
  let outstanding = 0;
  let currentTotal = 0;
  let difference = 0;
  let entered = 0;
  for (const l of lockers) {
    outstanding += l.outstanding;
    const c = current.get(l.id);
    if (c === undefined) continue;
    entered += 1;
    currentTotal += c;
    difference += l.outstanding - c;
  }
  return { outstanding, current: currentTotal, difference, entered };
}
