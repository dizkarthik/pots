import "server-only";

import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { accounts, expenses, paymentMethods, pots } from "@/lib/db/schema";
import type { ExpenseFilters } from "@/lib/filters/expenses";
import { monthOf, type Month } from "@/lib/month";
import { buildPaidViaOptions, type PaidViaOption } from "@/lib/payment-methods";

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
  paymentMethodId: string | null;
  /** The sub method's name, or the locker's when paid directly. */
  paidViaLabel: string;
}

export interface PotOption {
  id: string;
  name: string;
  icon: string;
  color: string;
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
  if (filters.potIds.length) where.push(inArray(expenses.potId, filters.potIds));
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
      accountId: expenses.accountId,
      paymentMethodId: expenses.paymentMethodId,
      paidViaLabel: sql<string>`coalesce(${paymentMethods.name}, ${accounts.bank})`,
    })
    .from(expenses)
    .innerJoin(pots, eq(pots.id, expenses.potId))
    .innerJoin(accounts, eq(accounts.id, expenses.accountId))
    .leftJoin(paymentMethods, eq(paymentMethods.id, expenses.paymentMethodId))
    .where(and(...where))
    .orderBy(...orderBy);

  return {
    rows: rows satisfies ExpenseRow[],
    totalPaise: rows.reduce((sum, r) => sum + r.amountPaise, 0),
  };
}

/** Pots and "Paid via" options for the filter menu and the expense form. */
export async function getExpenseOptions() {
  await requireSession();
  const db = getDb();
  const [potRows, lockerRows, methodRows] = await db.batch([
    db
      .select({
        id: pots.id,
        name: pots.name,
        icon: pots.icon,
        color: pots.color,
        startMonth: pots.startMonth,
        isArchived: pots.isArchived,
      })
      .from(pots)
      .orderBy(asc(pots.name)),
    db.select({ id: accounts.id, bank: accounts.bank }).from(accounts),
    db.select({ id: paymentMethods.id, name: paymentMethods.name, accountId: paymentMethods.accountId }).from(paymentMethods),
  ]);

  return {
    pots: potRows.map((p): PotOption => ({ ...p, startMonth: monthOf(p.startMonth) })),
    paidVia: buildPaidViaOptions(lockerRows, methodRows) satisfies PaidViaOption[],
  };
}
