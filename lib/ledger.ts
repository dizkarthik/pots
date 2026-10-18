import { MANUAL_ALLOCATION_FROM } from "./allocation";
import type { PotLedger } from "./balance";
import type { Expense, Pot, PotAllocation, PotArchivePeriod, PotBudget } from "./db/schema";
import { monthOf } from "./month";

/** Maps a pot's DB rows onto the pure ledger shape lib/balance.ts expects. */
export function toLedger(
  pot: Pick<Pot, "startMonth">,
  budgets: readonly Pick<PotBudget, "effectiveFrom" | "amountPaise">[],
  archivePeriods: readonly Pick<PotArchivePeriod, "fromMonth" | "toMonth">[],
  expenses: readonly Pick<Expense, "date" | "amountPaise">[],
  allocations: readonly Pick<PotAllocation, "month" | "amountPaise">[] = [],
): PotLedger {
  return {
    startMonth: monthOf(pot.startMonth),
    budgets: budgets.map((b) => ({ effectiveFrom: monthOf(b.effectiveFrom), amountPaise: b.amountPaise })),
    archivePeriods: archivePeriods.map((p) => ({
      fromMonth: monthOf(p.fromMonth),
      toMonth: p.toMonth ? monthOf(p.toMonth) : null,
    })),
    expenses: expenses.map((e) => ({ date: e.date, amountPaise: e.amountPaise })),
    manualFrom: MANUAL_ALLOCATION_FROM,
    allocations: allocations.map((a) => ({ month: monthOf(a.month), amountPaise: a.amountPaise })),
  };
}
