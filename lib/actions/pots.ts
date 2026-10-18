"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { MANUAL_ALLOCATION_FROM } from "@/lib/allocation";
import { budgetInEffect, nextBudgetEffectiveFrom } from "@/lib/budget";
import { getDb } from "@/lib/db/client";
import { accounts, monthAllocations, potAllocations, potArchivePeriods, potBudgets, pots } from "@/lib/db/schema";
import { toPaise } from "@/lib/money";
import { compareMonths, currentMonth, firstDayOf, monthOf } from "@/lib/month";
import { potFormSchema, potIdSchema } from "@/lib/validation/pots";
import { failed, invalid, type ActionResult } from "./result";

/** Returns an error message if the locker can't hold pots, else null. */
async function lockerProblem(id: string): Promise<string | null> {
  const [row] = await getDb().select({ isCredit: accounts.isCredit }).from(accounts).where(eq(accounts.id, id)).limit(1);
  if (!row) return "That locker no longer exists.";
  if (row.isCredit) return "Credit card lockers can't hold pots.";
  return null;
}

export async function createPot(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = potFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { name, icon, color, accountId, budget } = parsed.data;
  const db = getDb();
  const month = currentMonth();
  const startMonth = firstDayOf(month);
  const [locker, allocated] = await Promise.all([
    lockerProblem(accountId),
    db.select({ month: monthAllocations.month }).from(monthAllocations).where(eq(monthAllocations.month, startMonth)),
  ]);
  if (locker) return failed(locker);

  // A new pot starts this month and gets its full budget for it. If this
  // (manual) month was already allocated, the pot gets its share right away.
  const id = crypto.randomUUID();
  const amountPaise = toPaise(budget)!;
  const allocateNow = compareMonths(month, MANUAL_ALLOCATION_FROM) >= 0 && allocated.length > 0;
  await db.batch([
    db.insert(pots).values({ id, name, icon, color, accountId, startMonth }),
    db.insert(potBudgets).values({ potId: id, amountPaise, effectiveFrom: startMonth }),
    ...(allocateNow ? [db.insert(potAllocations).values({ potId: id, month: startMonth, amountPaise })] : []),
  ]);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updatePot(potId: unknown, input: unknown): Promise<ActionResult> {
  await requireSession();
  const id = potIdSchema.safeParse(potId);
  if (!id.success) return failed("Unknown pot.");
  const parsed = potFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { name, icon, color, accountId, budget } = parsed.data;
  const locker = await lockerProblem(accountId);
  if (locker) return failed(locker);

  const db = getDb();
  const budgets = await db.select().from(potBudgets).where(eq(potBudgets.potId, id.data));
  if (budgets.length === 0) return failed("Unknown pot.");

  // Budget edits only ever apply from the first day of next month, computed
  // here — the current and past months are never touched.
  const amountPaise = toPaise(budget)!;
  const effectiveFrom = nextBudgetEffectiveFrom();
  const inEffectNextMonth = budgetInEffect(
    budgets.map((b) => ({ effectiveFrom: monthOf(b.effectiveFrom), amountPaise: b.amountPaise })),
    effectiveFrom,
  );

  const updatePotRow = db.update(pots).set({ name, icon, color, accountId }).where(eq(pots.id, id.data));
  if (inEffectNextMonth?.amountPaise === amountPaise) {
    await updatePotRow;
  } else {
    await db.batch([
      updatePotRow,
      db
        .insert(potBudgets)
        .values({ potId: id.data, amountPaise, effectiveFrom: firstDayOf(effectiveFrom) })
        .onConflictDoUpdate({
          target: [potBudgets.potId, potBudgets.effectiveFrom],
          set: { amountPaise, updatedAt: sql`now()` },
        }),
    ]);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function archivePot(potId: unknown): Promise<ActionResult> {
  await requireSession();
  const id = potIdSchema.safeParse(potId);
  if (!id.success) return failed("Unknown pot.");

  const db = getDb();
  const [pot] = await db.select({ isArchived: pots.isArchived }).from(pots).where(eq(pots.id, id.data));
  if (!pot) return failed("Unknown pot.");
  if (pot.isArchived) return { ok: true };

  // Accrual stops after this month; the archive month itself still counts.
  await db.batch([
    db.update(pots).set({ isArchived: true }).where(eq(pots.id, id.data)),
    db.insert(potArchivePeriods).values({ potId: id.data, fromMonth: firstDayOf(currentMonth()) }),
  ]);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unarchivePot(potId: unknown): Promise<ActionResult> {
  await requireSession();
  const id = potIdSchema.safeParse(potId);
  if (!id.success) return failed("Unknown pot.");

  const db = getDb();
  // Accrual resumes this month; the months in between are not back-filled.
  await db.batch([
    db.update(pots).set({ isArchived: false }).where(eq(pots.id, id.data)),
    db
      .update(potArchivePeriods)
      .set({ toMonth: firstDayOf(currentMonth()) })
      .where(and(eq(potArchivePeriods.potId, id.data), isNull(potArchivePeriods.toMonth))),
  ]);

  revalidatePath("/", "layout");
  return { ok: true };
}
