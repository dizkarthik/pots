import "server-only";

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { accounts, expenses } from "@/lib/db/schema";
import { firstDayOf, lastDayOf, type Month } from "@/lib/month";

/**
 * Credit-card lockers show the total charged to the card in `month`: the sum
 * of expenses whose "Paid via" is that card, whichever pot they belong to.
 * Returns paise per credit locker id (cards with no spend are omitted).
 */
export async function getCreditCardSpend(month: Month): Promise<Map<string, number>> {
  await requireSession();
  const rows = await getDb()
    .select({ accountId: expenses.accountId, total: sql<string>`sum(${expenses.amountPaise})` })
    .from(expenses)
    .innerJoin(accounts, eq(accounts.id, expenses.accountId))
    .where(
      and(eq(accounts.isCredit, true), gte(expenses.date, firstDayOf(month)), lte(expenses.date, lastDayOf(month))),
    )
    .groupBy(expenses.accountId);
  return new Map(rows.map((r) => [r.accountId, Number(r.total)]));
}
