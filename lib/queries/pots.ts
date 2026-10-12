import "server-only";

import { asc, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { computePotBalance } from "@/lib/balance";
import { budgetInEffect, upcomingBudget, type BudgetEntry } from "@/lib/budget";
import { getDb } from "@/lib/db/client";
import { accounts, expenses, potArchivePeriods, potBudgets, pots, type Account } from "@/lib/db/schema";
import { toLedger } from "@/lib/ledger";
import { currentMonth, monthOf, type Month } from "@/lib/month";

export interface PotSummary {
  id: string;
  name: string;
  icon: string;
  color: string;
  accountId: string;
  accountName: string;
  bank: string;
  startMonth: Month;
  isArchived: boolean;
  /** Budget in effect for the viewed month (0 if none). */
  budget: number;
  /** A scheduled change that differs from the current budget. */
  upcoming: BudgetEntry | null;
  /** All budget rows, oldest first. */
  history: BudgetEntry[];
  /** Budget accrued in the viewed month (0 while archived). */
  budgetThisMonth: number;
  spentThisMonth: number;
  carriedOver: number;
  balance: number;
}

/**
 * Every pot with its computed balance for `month`. Expenses are pre-summed
 * per pot per month in SQL; the balance maths stays in lib/balance.ts.
 */
export async function getPotSummaries(month: Month = currentMonth()): Promise<{ month: Month; pots: PotSummary[]; accounts: Account[] }> {
  await requireSession();
  const db = getDb();

  const [accountRows, potRows, budgetRows, periodRows, monthlySpend] = await Promise.all([
    db.select().from(accounts).orderBy(asc(accounts.name)),
    db.select().from(pots).orderBy(asc(pots.name)),
    db.select().from(potBudgets).orderBy(asc(potBudgets.effectiveFrom)),
    db.select().from(potArchivePeriods),
    db
      .select({
        potId: expenses.potId,
        monthStart: sql<string>`to_char(date_trunc('month', ${expenses.date}), 'YYYY-MM-DD')`,
        total: sql<string>`sum(${expenses.amountPaise})`,
      })
      .from(expenses)
      .groupBy(expenses.potId, sql`date_trunc('month', ${expenses.date})`),
  ]);

  const byPot = <T extends { potId: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const r of rows) map.set(r.potId, [...(map.get(r.potId) ?? []), r]);
    return map;
  };
  const budgetsByPot = byPot(budgetRows);
  const periodsByPot = byPot(periodRows);
  const spendByPot = byPot(monthlySpend);
  const accountById = new Map(accountRows.map((a) => [a.id, a]));

  const summaries = potRows.map((pot): PotSummary => {
    // One synthetic entry per month (dated the 1st) is enough for the ledger:
    // it only compares dates against month boundaries.
    const spend = (spendByPot.get(pot.id) ?? []).map((s) => ({ date: s.monthStart, amountPaise: Number(s.total) }));
    const ledger = toLedger(pot, budgetsByPot.get(pot.id) ?? [], periodsByPot.get(pot.id) ?? [], spend);
    const result = computePotBalance(ledger, month);
    const current = budgetInEffect(ledger.budgets, month);
    const next = upcomingBudget(ledger.budgets, month);
    const account = accountById.get(pot.accountId);

    return {
      id: pot.id,
      name: pot.name,
      icon: pot.icon,
      color: pot.color,
      accountId: pot.accountId,
      accountName: account?.name ?? "—",
      bank: account?.bank ?? "",
      startMonth: monthOf(pot.startMonth),
      isArchived: pot.isArchived,
      budget: current?.amountPaise ?? 0,
      upcoming: next && next.amountPaise !== current?.amountPaise ? next : null,
      history: [...ledger.budgets],
      budgetThisMonth: result.budgetThisMonth,
      spentThisMonth: result.spentThisMonth,
      carriedOver: result.carriedOver,
      balance: result.balance,
    };
  });

  return { month, pots: summaries, accounts: accountRows };
}

