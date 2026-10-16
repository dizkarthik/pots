import "server-only";

import { desc, eq, gte, lte, and, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { accounts, expenses, paymentMethods, pots } from "@/lib/db/schema";
import { addMonths, firstDayOf, lastDayOf, monthsBetween, type Month } from "@/lib/month";

export interface TrendPoint {
  month: Month;
  /** Total spent in the month, in paise. */
  spent: number;
}

/** Total spend per month for the `count` months ending at `month` (zeros included). */
export async function getSpendTrend(month: Month, count = 6): Promise<TrendPoint[]> {
  await requireSession();
  const from = addMonths(month, -(count - 1));
  const rows = await getDb()
    .select({
      month: sql<string>`to_char(date_trunc('month', ${expenses.date}), 'YYYY-MM')`,
      total: sql<string>`sum(${expenses.amountPaise})`,
    })
    .from(expenses)
    .where(and(gte(expenses.date, firstDayOf(from)), lte(expenses.date, lastDayOf(month))))
    .groupBy(sql`date_trunc('month', ${expenses.date})`);
  const byMonth = new Map(rows.map((r) => [r.month, Number(r.total)]));
  return monthsBetween(from, month).map((m) => ({ month: m, spent: byMonth.get(m) ?? 0 }));
}

export interface RecentExpense {
  id: string;
  date: string;
  amountPaise: number;
  note: string | null;
  potName: string;
  potIcon: string;
  potColor: string;
  paidViaLabel: string;
}

export async function getRecentExpenses(limit = 8): Promise<RecentExpense[]> {
  await requireSession();
  return getDb()
    .select({
      id: expenses.id,
      date: expenses.date,
      amountPaise: expenses.amountPaise,
      note: expenses.note,
      potName: pots.name,
      potIcon: pots.icon,
      potColor: pots.color,
      paidViaLabel: sql<string>`coalesce(${paymentMethods.name}, ${accounts.bank})`,
    })
    .from(expenses)
    .innerJoin(pots, eq(pots.id, expenses.potId))
    .innerJoin(accounts, eq(accounts.id, expenses.accountId))
    .leftJoin(paymentMethods, eq(paymentMethods.id, expenses.paymentMethodId))
    .orderBy(desc(expenses.date), desc(expenses.createdAt))
    .limit(limit);
}
