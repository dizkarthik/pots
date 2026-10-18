import { budgetInEffect, type BudgetEntry } from "./budget";
import { addMonths, compareMonths, monthsBetween, type Month } from "./month";

/*
 * Monthly allocation. Up to October 2026 each pot's budget accrued
 * automatically; from MANUAL_ALLOCATION_FROM on, a month's budgets reach the
 * pots only when the user clicks Allocate for that month (lib/balance.ts adds
 * the allocated amount). Allocated months are locked. Unallocated months stay
 * pending, oldest first, so they can be caught up later.
 */
export const MANUAL_ALLOCATION_FROM: Month = "2026-11";

/** Manual months up to `current` that haven't been allocated yet, oldest first. */
export function pendingAllocationMonths(allocated: Iterable<Month>, current: Month): Month[] {
  if (compareMonths(current, MANUAL_ALLOCATION_FROM) < 0) return [];
  const done = new Set(allocated);
  return monthsBetween(MANUAL_ALLOCATION_FROM, current).filter((m) => !done.has(m));
}

/** The next month the user will allocate when nothing is pending. */
export function nextAllocationMonth(current: Month): Month {
  const next = addMonths(current, 1);
  return compareMonths(next, MANUAL_ALLOCATION_FROM) < 0 ? MANUAL_ALLOCATION_FROM : next;
}

/** Pots that take part in a month's allocation: active, and started by then. */
export function isAllocationEligible(pot: { isArchived: boolean; startMonth: Month }, month: Month): boolean {
  return !pot.isArchived && compareMonths(pot.startMonth, month) <= 0;
}

/** The amount the allocation form pre-fills: the budget in effect for that month. */
export function plannedAllocation(budgets: readonly BudgetEntry[], month: Month): number {
  return budgetInEffect(budgets, month)?.amountPaise ?? 0;
}
