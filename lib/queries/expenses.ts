import "server-only";

import { and, asc, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { accounts, expenses, pots } from "@/lib/db/schema";
import type { ExpenseFilters } from "@/lib/filters/expenses";
import { monthOf, type Month } from "@/lib/month";

export interface ExpenseRow {
  id: string;
  date: string;
  amountPaise: number;
  note: string | null;
  potId: string;
  potName: string;
  potIcon: string;
  potColor: string;
  accountId: string;
  accountName: string;
  bank: string;
}

export interface PotOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  accountName: string;
  startMonth: Month;
  isArchived: boolean;
}

/** Escapes LIKE wildcards so a search for "50%" matches literally. */
function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function getExpenses(filters: ExpenseFilters) {
  await requireSession();
  const db = getDb();

  const where: SQL[] = [gte(expenses.date, filters.from), lte(expenses.date, filters.to)];
  if (filters.potId) where.push(eq(expenses.potId, filters.potId));
  if (filters.accountId) where.push(eq(pots.accountId, filters.accountId));
  if (filters.minPaise !== undefined) where.push(gte(expenses.amountPaise, filters.minPaise));
  if (filters.maxPaise !== undefined) where.push(lte(expenses.amountPaise, filters.maxPaise));
  if (filters.q) {
    const pattern = likePattern(filters.q);
    where.push(or(ilike(expenses.note, pattern), ilike(pots.name, pattern))!);
  }

  const dir = filters.sort.direction === "asc" ? asc : desc;
  const orderBy = {
    date: [dir(expenses.date), dir(expenses.createdAt)],
    amount: [dir(expenses.amountPaise), desc(expenses.date)],
    pot: [dir(pots.name), desc(expenses.date)],
  }[filters.sort.field];

  const rows = await db
    .select({
      id: expenses.id,
      date: expenses.date,
      amountPaise: expenses.amountPaise,
      note: expenses.note,
      potId: pots.id,
      potName: pots.name,
      potIcon: pots.icon,
      potColor: pots.color,
      accountId: accounts.id,
      accountName: accounts.name,
      bank: accounts.bank,
    })
    .from(expenses)
    .innerJoin(pots, eq(pots.id, expenses.potId))
    .innerJoin(accounts, eq(accounts.id, pots.accountId))
    .where(and(...where))
    .orderBy(...orderBy);

  return {
    rows: rows satisfies ExpenseRow[],
    totalPaise: rows.reduce((sum, r) => sum + r.amountPaise, 0),
  };
}

/** Pots and lockers for filter menus and the expense form. */
export async function getExpenseOptions() {
  await requireSession();
  const db = getDb();
  const [potRows, accountRows] = await Promise.all([
    db
      .select({
        id: pots.id,
        name: pots.name,
        icon: pots.icon,
        color: pots.color,
        accountName: accounts.name,
        startMonth: pots.startMonth,
        isArchived: pots.isArchived,
      })
      .from(pots)
      .innerJoin(accounts, eq(accounts.id, pots.accountId))
      .orderBy(asc(pots.name)),
    db.select({ id: accounts.id, name: accounts.name }).from(accounts).orderBy(asc(accounts.name)),
  ]);

  return {
    pots: potRows.map((p): PotOption => ({ ...p, startMonth: monthOf(p.startMonth) })),
    accounts: accountRows,
  };
}

