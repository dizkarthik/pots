import "server-only";

import { and, asc, desc, eq, gte, ilike, inArray, lte, or, type SQL } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { expenses, paymentMethods, pots } from "@/lib/db/schema";
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
  paymentMethodId: string;
  paymentMethodName: string;
}

export interface PotOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  startMonth: Month;
  isArchived: boolean;
}

export interface PaymentMethodOption {
  id: string;
  name: string;
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
      paymentMethodId: paymentMethods.id,
      paymentMethodName: paymentMethods.name,
    })
    .from(expenses)
    .innerJoin(pots, eq(pots.id, expenses.potId))
    .innerJoin(paymentMethods, eq(paymentMethods.id, expenses.paymentMethodId))
    .where(and(...where))
    .orderBy(...orderBy);

  return {
    rows: rows satisfies ExpenseRow[],
    totalPaise: rows.reduce((sum, r) => sum + r.amountPaise, 0),
  };
}

/** Pots and payment methods for the filter menu and the expense form. */
export async function getExpenseOptions() {
  await requireSession();
  const db = getDb();
  const [potRows, methodRows] = await Promise.all([
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
    // Presets first (they were created first), then ones added later.
    db.select({ id: paymentMethods.id, name: paymentMethods.name }).from(paymentMethods).orderBy(asc(paymentMethods.createdAt)),
  ]);

  return {
    pots: potRows.map((p): PotOption => ({ ...p, startMonth: monthOf(p.startMonth) })),
    paymentMethods: methodRows satisfies PaymentMethodOption[],
  };
}
