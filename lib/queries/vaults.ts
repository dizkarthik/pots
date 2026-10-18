import "server-only";

import { asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import type { BudgetEntry } from "@/lib/budget";
import { getDb } from "@/lib/db/client";
import { accounts, vaultAdjustments, vaultAmounts, vaults } from "@/lib/db/schema";
import { currentMonth, monthOf, type Month } from "@/lib/month";
import { computeVault, type VaultAdjustment, type VaultMonth } from "@/lib/vaults";

export interface VaultRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** Parked in a bank locker (money saved there; counts toward its balance), or null. */
  accountId: string | null;
  /** Parked in an investment type (Mutual Fund, Stocks…), or null. */
  parkedIn: string | null;
  /** Display name of where it's parked (locker name or investment type), or null if not set. */
  parkedLabel: string | null;
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

export async function getVaultSummaries(
  month: Month = currentMonth(),
): Promise<{ month: Month; vaults: VaultRow[]; bankLockers: { id: string; bank: string }[] }> {
  await requireSession();
  const db = getDb();
  const [vaultRows, amountRows, adjustmentRows, accountRows] = await db.batch([
    db.select().from(vaults).orderBy(asc(vaults.name)),
    db.select().from(vaultAmounts).orderBy(asc(vaultAmounts.effectiveFrom)),
    db.select().from(vaultAdjustments),
    db.select({ id: accounts.id, bank: accounts.bank, isCredit: accounts.isCredit }).from(accounts).orderBy(asc(accounts.bank)),
  ]);
  const bankById = new Map(accountRows.map((a) => [a.id, a.bank]));

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
      accountId: v.accountId,
      parkedIn: v.parkedIn,
      parkedLabel: v.accountId ? (bankById.get(v.accountId) ?? null) : v.parkedIn,
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
  // Bank lockers a vault can be parked in (credit cards can't hold vaults).
  const bankLockers = accountRows.filter((a) => !a.isCredit).map((a) => ({ id: a.id, bank: a.bank }));
  return { month, vaults: rows, bankLockers };
}
