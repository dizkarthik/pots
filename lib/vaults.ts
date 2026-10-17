import { budgetInEffect, upcomingBudget, type BudgetEntry } from "./budget";
import { compareMonths, monthsBetween, type Month } from "./month";

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
  return {
    investedTotal,
    thisMonth: vaultMonth(ledger, month),
    monthly,
    upcoming: next && next.amountPaise !== monthly ? next : null,
  };
}

/** Months a vault can be adjusted for: from its start month to the current month, newest first. */
export function adjustableMonths(startMonth: Month, currentMonth: Month): Month[] {
  return monthsBetween(startMonth, currentMonth).reverse();
}
