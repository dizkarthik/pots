import type { PotSummary } from "@/lib/queries/pots";

// Pure dashboard aggregations over computed pot summaries. Balances themselves
// come from lib/balance.ts — nothing here re-derives budget maths.

type DashboardPot = Pick<
  PotSummary,
  "id" | "name" | "icon" | "color" | "bank" | "accountId" | "isArchived" | "budgetThisMonth" | "spentThisMonth" | "balance" | "carriedOver"
>;

export interface MonthTotals {
  /** Budget accrued this month across active pots. */
  budget: number;
  /** Spent this month across all pots (archived included — the money was spent). */
  spent: number;
  /** budget − spent; negative when the month is over budget overall. */
  remaining: number;
  /** Σ pot balances including carry-over: what is actually left to spend. */
  available: number;
  overspentCount: number;
}

export function monthTotals(pots: readonly DashboardPot[]): MonthTotals {
  let budget = 0;
  let spent = 0;
  let available = 0;
  let overspentCount = 0;
  for (const p of pots) {
    if (!p.isArchived) budget += p.budgetThisMonth;
    spent += p.spentThisMonth;
    available += p.balance;
    if (p.balance < 0) overspentCount += 1;
  }
  return { budget, spent, remaining: budget - spent, available, overspentCount };
}

// A type alias (not an interface) so it satisfies the charts' Record<string, unknown> rows.
export type SpendRow = {
  name: string;
  spent: number;
};

/**
 * Pots ranked by spend this month, largest first; the tail beyond `limit`
 * folds into one "Other" row so the chart never needs more than a handful
 * of bars. Pots with no spend are left out.
 */
export function spendByPot(pots: readonly DashboardPot[], limit = 8): SpendRow[] {
  const spending = pots
    .filter((p) => p.spentThisMonth > 0)
    .map((p) => ({ name: p.name, spent: p.spentThisMonth }))
    .sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name));
  if (spending.length <= limit) return spending;
  const head = spending.slice(0, limit - 1);
  const other = spending.slice(limit - 1).reduce((sum, r) => sum + r.spent, 0);
  return [...head, { name: `Other (${spending.length - head.length} pots)`, spent: other }];
}

export interface LockerBudgetRow {
  accountId: string;
  bank: string;
  budget: number;
  spent: number;
}

/** This month's budget vs spend per locker (lockers with no budget are skipped). */
export function budgetVsActualByLocker(pots: readonly DashboardPot[]): LockerBudgetRow[] {
  const rows = new Map<string, LockerBudgetRow>();
  for (const p of pots) {
    const row = rows.get(p.accountId) ?? { accountId: p.accountId, bank: p.bank, budget: 0, spent: 0 };
    if (!p.isArchived) row.budget += p.budgetThisMonth;
    row.spent += p.spentThisMonth;
    rows.set(p.accountId, row);
  }
  return [...rows.values()]
    .filter((r) => r.budget > 0 || r.spent > 0)
    .sort((a, b) => b.budget - a.budget || a.bank.localeCompare(b.bank));
}

/**
 * Pots that most need attention: overspent first (most negative balance
 * first), then the smallest share of this month's budget left.
 */
export function potsNeedingAttention<T extends DashboardPot>(pots: readonly T[], limit = 12): T[] {
  const share = (p: DashboardPot) => (p.budgetThisMonth > 0 ? p.balance / p.budgetThisMonth : Number.POSITIVE_INFINITY);
  return pots
    .filter((p) => !p.isArchived)
    .slice()
    .sort((a, b) => {
      const aOver = a.balance < 0;
      const bOver = b.balance < 0;
      if (aOver !== bOver) return aOver ? -1 : 1;
      if (aOver) return a.balance - b.balance;
      return share(a) - share(b) || a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
