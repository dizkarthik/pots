import "server-only";

import { asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import type { BudgetEntry } from "@/lib/budget";
import { getDb } from "@/lib/db/client";
import { vaultAdjustments, vaultAmounts, vaults } from "@/lib/db/schema";
import { currentMonth, monthOf, type Month } from "@/lib/month";
import { computeVault, type VaultAdjustment, type VaultMonth } from "@/lib/vaults";

export interface VaultRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  startMonth: Month;
  monthly: number;
  upcoming: BudgetEntry | null;
  thisMonth: VaultMonth;
  /** Last month's line, or null if the vault started this month. */
  lastMonth: VaultMonth | null;
  /** Months the vault has been running (start through the current month). */
  months: number;
  investedTotal: number;
  /** Amount history, oldest first. */
  history: BudgetEntry[];
  /** Adjustments with notes, newest first. */
  adjustments: (VaultAdjustment & { note: string | null })[];
}

export async function getVaultSummaries(month: Month = currentMonth()): Promise<{ month: Month; vaults: VaultRow[] }> {
  await requireSession();
  const db = getDb();
  const [vaultRows, amountRows, adjustmentRows] = await Promise.all([
    db.select().from(vaults).orderBy(asc(vaults.name)),
    db.select().from(vaultAmounts).orderBy(asc(vaultAmounts.effectiveFrom)),
    db.select().from(vaultAdjustments),
  ]);

  const rows = vaultRows.map((v): VaultRow => {
    const amounts = amountRows
      .filter((a) => a.vaultId === v.id)
      .map((a) => ({ effectiveFrom: monthOf(a.effectiveFrom), amountPaise: a.amountPaise }));
    const adjustments = adjustmentRows
      .filter((a) => a.vaultId === v.id)
      .map((a) => ({ month: monthOf(a.month), amountPaise: a.amountPaise, note: a.note }))
      .sort((a, b) => (a.month < b.month ? 1 : -1));
    const startMonth = monthOf(v.startMonth);
    const summary = computeVault({ startMonth, amounts, adjustments }, month);
    return {
      id: v.id,
      name: v.name,
      icon: v.icon,
      color: v.color,
      startMonth,
      monthly: summary.monthly,
      upcoming: summary.upcoming,
      thisMonth: summary.thisMonth,
      lastMonth: summary.lastMonth,
      months: summary.months,
      investedTotal: summary.investedTotal,
      history: amounts,
      adjustments,
    };
  });
  return { month, vaults: rows };
}
