import { addMonths, compareMonths, currentMonth, type Month } from "./month";

export interface BudgetEntry {
  /** First month this amount applies to. */
  effectiveFrom: Month;
  amountPaise: number;
}

/**
 * The month a budget edit made at `now` takes effect: always the first day of
 * NEXT month in India time (December rolls into January). Server-only input —
 * never accept this from the client.
 */
export function nextBudgetEffectiveFrom(now: Date = new Date()): Month {
  return addMonths(currentMonth(now), 1);
}

/**
 * Mirrors the DB upsert on (pot_id, effective_from): an edit replaces any row
 * for the same month (so repeat edits keep only the latest) and otherwise adds
 * one. Earlier rows are never touched.
 */
export function applyBudgetEdit(
  budgets: readonly BudgetEntry[],
  amountPaise: number,
  now: Date = new Date(),
): BudgetEntry[] {
  const effectiveFrom = nextBudgetEffectiveFrom(now);
  return [...budgets.filter((b) => b.effectiveFrom !== effectiveFrom), { effectiveFrom, amountPaise }].sort(
    (a, b) => compareMonths(a.effectiveFrom, b.effectiveFrom),
  );
}

/** The budget row with the latest effectiveFrom ≤ month, if any. */
export function budgetInEffect(budgets: readonly BudgetEntry[], month: Month): BudgetEntry | undefined {
  let found: BudgetEntry | undefined;
  for (const b of budgets) {
    if (compareMonths(b.effectiveFrom, month) <= 0 && (!found || compareMonths(b.effectiveFrom, found.effectiveFrom) > 0)) {
      found = b;
    }
  }
  return found;
}

/** The earliest budget scheduled after `month` (the "Upcoming" change), if any. */
export function upcomingBudget(budgets: readonly BudgetEntry[], month: Month): BudgetEntry | undefined {
  let found: BudgetEntry | undefined;
  for (const b of budgets) {
    if (compareMonths(b.effectiveFrom, month) > 0 && (!found || compareMonths(b.effectiveFrom, found.effectiveFrom) < 0)) {
      found = b;
    }
  }
  return found;
}
