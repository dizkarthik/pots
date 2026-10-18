"use server";

import { asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isAllocationEligible, nextAllocationMonth, pendingAllocationMonths, plannedAllocation } from "@/lib/allocation";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { monthAllocations, potAllocations, potBudgets, pots } from "@/lib/db/schema";
import { toPaise } from "@/lib/money";
import { currentMonth, firstDayOf, monthOf, type Month } from "@/lib/month";
import { allocationSchema } from "@/lib/validation/allocations";
import { failed, invalid, type ActionResult } from "./result";

type Parsed = { month: Month; amounts: Map<string, number> };

/**
 * Validates the form against the pots that take part in `month`: every
 * eligible pot needs an amount and no other pot may appear. Also returns the
 * budget-change upserts for amounts that differ from the plan ("this month
 * and later": the budget row is written at `month`).
 */
async function prepare(input: unknown, check: (month: Month, allocated: Month[]) => string | null) {
  const parsed = allocationSchema.safeParse(input);
  if (!parsed.success) return { error: invalid(parsed.error) } as const;
  const month = parsed.data.month as Month;

  const db = getDb();
  const [potRows, budgetRows, allocatedRows] = await db.batch([
    db.select({ id: pots.id, isArchived: pots.isArchived, startMonth: pots.startMonth }).from(pots),
    db.select().from(potBudgets).orderBy(asc(potBudgets.effectiveFrom)),
    db.select({ month: monthAllocations.month }).from(monthAllocations),
  ]);
  const problem = check(month, allocatedRows.map((r) => monthOf(r.month)));
  if (problem) return { error: failed(problem) } as const;

  const eligible = potRows.filter((p) => isAllocationEligible({ ...p, startMonth: monthOf(p.startMonth) }, month));
  const given = parsed.data.amounts;
  const stale =
    Object.keys(given).length !== eligible.length || eligible.some((p) => given[p.id] === undefined);
  if (stale) return { error: failed("Your pots changed since you opened this. Close it and open View again.") } as const;

  const amounts: Parsed["amounts"] = new Map(eligible.map((p) => [p.id, toPaise(given[p.id])!]));
  const budgetChanges = eligible.flatMap((p) => {
    const planned = plannedAllocation(
      budgetRows.filter((b) => b.potId === p.id).map((b) => ({ effectiveFrom: monthOf(b.effectiveFrom), amountPaise: b.amountPaise })),
      month,
    );
    const amountPaise = amounts.get(p.id)!;
    if (amountPaise === planned) return [];
    return [
      db
        .insert(potBudgets)
        .values({ potId: p.id, amountPaise, effectiveFrom: firstDayOf(month) })
        .onConflictDoUpdate({ target: [potBudgets.potId, potBudgets.effectiveFrom], set: { amountPaise, updatedAt: sql`now()` } }),
    ];
  });
  return { month, amounts, budgetChanges } as const;
}

/**
 * Allocate a pending month: adds each pot's amount to its balance and locks
 * the month. Changed amounts also become the pot's budget from that month on.
 */
export async function allocateMonth(input: unknown): Promise<ActionResult> {
  await requireSession();
  const result = await prepare(input, (month, allocated) =>
    pendingAllocationMonths(allocated, currentMonth()).includes(month) ? null : "That month can't be allocated (already done, or not open yet).",
  );
  if ("error" in result) return result.error!;
  const { month, amounts, budgetChanges } = result;

  const db = getDb();
  const day = firstDayOf(month);
  try {
    // One transaction: the month row's primary key makes a second Allocate fail as a whole.
    await db.batch([
      db.insert(monthAllocations).values({ month: day }),
      ...budgetChanges,
      ...(amounts.size > 0
        ? [db.insert(potAllocations).values([...amounts].map(([potId, amountPaise]) => ({ potId, month: day, amountPaise })))]
        : []),
    ]);
  } catch {
    return failed("That month was already allocated.");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Before the next month opens: save its planned amounts (as budgets from that month on) without allocating. */
export async function saveAllocationPlan(input: unknown): Promise<ActionResult> {
  await requireSession();
  const result = await prepare(input, (month, allocated) =>
    pendingAllocationMonths(allocated, currentMonth()).length === 0 && month === nextAllocationMonth(currentMonth())
      ? null
      : "Only next month's plan can be saved.",
  );
  if ("error" in result) return result.error!;
  if (result.budgetChanges.length > 0) {
    const [first, ...rest] = result.budgetChanges;
    await getDb().batch([first, ...rest]);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
