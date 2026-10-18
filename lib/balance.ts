import { budgetInEffect, type BudgetEntry } from "./budget";
import { compareMonths, lastDayOf, monthOf, monthsBetween, type Month } from "./month";

/*
 * Pot balances are COMPUTED, never stored:
 *
 *   balance(pot, M) = Σ budget in effect for each accruing month m in [startMonth, M]
 *                   − Σ expenses for the pot dated ≤ end of M
 *
 * - The budget in effect for m is the entry with the latest effectiveFrom ≤ m.
 * - Surplus and overspend both carry forward implicitly.
 * - A pot gets its full budget in its start month (no proration).
 * - Archive periods freeze accrual: a month strictly after `fromMonth` and
 *   strictly before `toMonth` (or with no `toMonth`, any month after
 *   `fromMonth`) accrues nothing. The archive month and the unarchive month
 *   both accrue, and gap months are never back-filled.
 * - Manual allocation: from `manualFrom` on, a month adds its *allocated*
 *   amount (written when the user clicks Allocate for that month) instead of
 *   the budget in effect, and nothing until it's allocated. Budgets then only
 *   pre-fill the allocation form. Months before `manualFrom` accrue as above.
 */

export interface AllocationEntry {
  month: Month;
  amountPaise: number;
}

export interface ArchivePeriod {
  /** Month the pot was archived in (still accrues). */
  fromMonth: Month;
  /** Month the pot was unarchived in (accrues again); null while archived. */
  toMonth: Month | null;
}

export interface ExpenseEntry {
  /** "YYYY-MM-DD" */
  date: string;
  amountPaise: number;
}

export interface PotLedger {
  startMonth: Month;
  budgets: readonly BudgetEntry[];
  expenses: readonly ExpenseEntry[];
  archivePeriods?: readonly ArchivePeriod[];
  /** First month that needs a manual allocation; omitted = always automatic. */
  manualFrom?: Month;
  /** Allocated amounts for manual months. */
  allocations?: readonly AllocationEntry[];
}

export interface PotBalance {
  /** Total budget accrued from startMonth through M. */
  budgetTotal: number;
  /** Total spent from the pot's first expense through end of M. */
  spentTotal: number;
  /** budgetTotal − spentTotal; negative means overspent. */
  balance: number;
  /** Budget accrued in M itself (0 if M is frozen or before startMonth). */
  budgetThisMonth: number;
  /** Spent within M. */
  spentThisMonth: number;
  /** Balance at the end of M−1 (what rolled into M). */
  carriedOver: number;
}

export function isMonthFrozen(month: Month, periods: readonly ArchivePeriod[] = []): boolean {
  return periods.some(
    (p) =>
      compareMonths(month, p.fromMonth) > 0 && (p.toMonth === null || compareMonths(month, p.toMonth) < 0),
  );
}

/** Budget accrued in a single month (0 before start, while frozen, or while a manual month is unallocated). */
export function monthlyAccrual(ledger: PotLedger, month: Month): number {
  if (compareMonths(month, ledger.startMonth) < 0) return 0;
  if (isMonthFrozen(month, ledger.archivePeriods)) return 0;
  if (ledger.manualFrom && compareMonths(month, ledger.manualFrom) >= 0) {
    return ledger.allocations?.find((a) => a.month === month)?.amountPaise ?? 0;
  }
  return budgetInEffect(ledger.budgets, month)?.amountPaise ?? 0;
}

function sumBudgetThrough(ledger: PotLedger, month: Month): number {
  let total = 0;
  for (const m of monthsBetween(ledger.startMonth, month)) total += monthlyAccrual(ledger, m);
  return total;
}

function sumSpent(expenses: readonly ExpenseEntry[], predicate: (date: string) => boolean): number {
  let total = 0;
  for (const e of expenses) if (predicate(e.date)) total += e.amountPaise;
  return total;
}

export function computePotBalance(ledger: PotLedger, month: Month): PotBalance {
  const endOfMonth = lastDayOf(month);
  const budgetTotal = sumBudgetThrough(ledger, month);
  const spentTotal = sumSpent(ledger.expenses, (d) => d <= endOfMonth);
  const budgetThisMonth = monthlyAccrual(ledger, month);
  const spentThisMonth = sumSpent(ledger.expenses, (d) => monthOf(d) === month);
  const balance = budgetTotal - spentTotal;

  return {
    budgetTotal,
    spentTotal,
    balance,
    budgetThisMonth,
    spentThisMonth,
    // Derived rather than recomputed so the two can never disagree.
    carriedOver: balance - budgetThisMonth + spentThisMonth,
  };
}
