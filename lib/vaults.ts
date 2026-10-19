import { budgetInEffect, upcomingBudget, type BudgetEntry } from "./budget";
import { addMonths, compareMonths, monthsBetween, type Month } from "./month";

/*
 * Vault invested total — COMPUTED, never stored:
 *
 *   invested(vault, M) = Σ for each month m in [startMonth, M]:
 *                          adjustment(m)  if that month was adjusted (₹0 = skipped)
 *                          otherwise the monthly amount in effect for m
 *
 * - The monthly amount "in effect" for m is the entry with the latest
 *   effectiveFrom ≤ m (same rule as pot budgets; edits apply from next month).
 * - No cron: a new month simply adds one more term.
 */

export interface VaultAdjustment {
  month: Month;
  amountPaise: number;
}

export interface VaultLedger {
  startMonth: Month;
  amounts: readonly BudgetEntry[];
  adjustments: readonly VaultAdjustment[];
}

export interface VaultMonth {
  month: Month;
  /** What was invested in the month (adjusted amount if any, else the auto amount). */
  amountPaise: number;
  /** The monthly amount that would have applied without an adjustment. */
  autoPaise: number;
  adjusted: boolean;
}

export function vaultMonth(ledger: VaultLedger, month: Month): VaultMonth {
  const autoPaise = compareMonths(month, ledger.startMonth) < 0 ? 0 : (budgetInEffect(ledger.amounts, month)?.amountPaise ?? 0);
  const adjustment = ledger.adjustments.find((a) => a.month === month);
  if (adjustment && compareMonths(month, ledger.startMonth) >= 0) {
    return { month, amountPaise: adjustment.amountPaise, autoPaise, adjusted: true };
  }
  return { month, amountPaise: autoPaise, autoPaise, adjusted: false };
}

export interface VaultSummary {
  /** Total invested from the start month through M. */
  investedTotal: number;
  /** How long the vault has been running: months from its start through M (0 before it starts). */
  months: number;
  /** Last month's line, or null if the vault started this month. */
  lastMonth: VaultMonth | null;
  /** This month's line (amount actually invested, auto amount, adjusted?). */
  thisMonth: VaultMonth;
  /** Monthly amount in effect for M. */
  monthly: number;
  /** A scheduled monthly-amount change after M that differs from `monthly`. */
  upcoming: BudgetEntry | null;
}

export function computeVault(ledger: VaultLedger, month: Month): VaultSummary {
  let investedTotal = 0;
  for (const m of monthsBetween(ledger.startMonth, month)) investedTotal += vaultMonth(ledger, m).amountPaise;
  const monthly = budgetInEffect(ledger.amounts, month)?.amountPaise ?? 0;
  const next = upcomingBudget(ledger.amounts, month);
  const previous = addMonths(month, -1);
  return {
    investedTotal,
    months: monthsBetween(ledger.startMonth, month).length,
    lastMonth: compareMonths(previous, ledger.startMonth) >= 0 ? vaultMonth(ledger, previous) : null,
    thisMonth: vaultMonth(ledger, month),
    monthly,
    upcoming: next && next.amountPaise !== monthly ? next : null,
  };
}

/** Every month from the vault's start through `month`, newest first (the "View" list). */
export function vaultHistory(ledger: VaultLedger, month: Month): VaultMonth[] {
  return monthsBetween(ledger.startMonth, month)
    .reverse()
    .map((m) => vaultMonth(ledger, m));
}

/**
 * Months a step up/down can start from: next month, or any month back to the
 * vault's start (a step-up that already happened can be recorded). Newest first.
 */
export function stepStartMonths(startMonth: Month, currentMonth: Month): Month[] {
  return monthsBetween(startMonth, addMonths(currentMonth, 1)).reverse();
}

/** Months a vault can be adjusted for: from its start month to the current month, newest first. */
export function adjustableMonths(startMonth: Month, currentMonth: Month): Month[] {
  return monthsBetween(startMonth, currentMonth).reverse();
}

/*
 * "Parked": where a vault's money is saved. Either a bank locker (credit cards
 * excluded) — its invested total then counts toward that locker's balance — or
 * one of these investment types. Encoded for forms/URLs as "a:<accountId>" or
 * "i:<instrument>"; "" = not set. ("Cash" is a locker, so it isn't repeated here.)
 */
export const VAULT_INSTRUMENTS = ["Mutual Fund", "Stocks", "IPO", "Gold", "PPF", "EPF", "Bonds", "Crypto", "Post Office"] as const;
export type VaultInstrument = (typeof VAULT_INSTRUMENTS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Parked = { kind: "locker"; accountId: string } | { kind: "instrument"; instrument: VaultInstrument } | null;

export function parseParked(value: string): Parked | undefined {
  if (value === "") return null;
  if (value.startsWith("a:") && UUID.test(value.slice(2))) return { kind: "locker", accountId: value.slice(2).toLowerCase() };
  const name = value.slice(2);
  if (value.startsWith("i:") && (VAULT_INSTRUMENTS as readonly string[]).includes(name)) {
    return { kind: "instrument", instrument: name as VaultInstrument };
  }
  return undefined; // invalid
}

export function parkedValue(vault: { accountId: string | null; parkedIn: string | null }): string {
  if (vault.accountId) return `a:${vault.accountId}`;
  if (vault.parkedIn) return `i:${vault.parkedIn}`;
  return "";
}
