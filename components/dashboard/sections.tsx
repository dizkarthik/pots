import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Chip } from "@/components/base/badges/chip";
import { PotTile } from "@/components/pots/pot-tile";
import { Money } from "@/components/shared/money";
import type { LockerBudgetRow, MonthTotals } from "@/lib/dashboard";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/month";
import type { RecentExpense } from "@/lib/queries/dashboard";
import type { PotSummary } from "@/lib/queries/pots";
import { cx } from "@/utils/cx";

function Tile({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-3xl border border-border-button-default bg-background-primary-default p-5">
      <span className="text-caption-1-regular text-text-tertiary">{label}</span>
      <span className="text-title-1-semibold text-text-primary">{children}</span>
      {hint && <span className="text-caption-1-regular text-text-secondary">{hint}</span>}
    </div>
  );
}

/** This month at a glance: budget, spent, remaining. */
export function KpiRow({ totals, monthLabel }: { totals: MonthTotals; monthLabel: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Tile label={`Budget · ${monthLabel}`} hint="Across all active pots">
        <Money paise={totals.budget} />
      </Tile>
      <Tile
        label="Spent"
        hint={totals.budget > 0 ? `${Math.round((totals.spent / totals.budget) * 100)}% of this month's budget` : undefined}
      >
        <Money paise={totals.spent} />
      </Tile>
      <Tile
        label="Remaining"
        hint={
          <>
            Available incl. carry-over: <Money paise={totals.available} signed />
          </>
        }
      >
        <Money paise={totals.remaining} signed />
      </Tile>
    </div>
  );
}

/** Budget vs actual per locker as meters: spent against this month's budget. */
export function BudgetVsActual({ rows }: { rows: LockerBudgetRow[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((r) => {
        const pct = r.budget > 0 ? r.spent / r.budget : r.spent > 0 ? 1 : 0;
        const over = r.spent > r.budget;
        return (
          <li key={r.accountId} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-body-regular">
              <span className="text-text-primary">{r.bank}</span>
              <span className="tabular-nums text-text-secondary">
                <Money
                  paise={r.spent}
                  className={cx("text-body-medium", over ? "text-text-error-primary" : "text-text-primary")}
                />{" "}
                of {formatINR(r.budget)}
              </span>
            </div>
            <div
              role="meter"
              aria-label={`${r.bank}: ${formatINR(r.spent)} spent of ${formatINR(r.budget)}`}
              aria-valuemin={0}
              aria-valuemax={r.budget / 100}
              aria-valuenow={r.spent / 100}
              className="h-2 overflow-hidden rounded-full bg-chart-track"
            >
              <div
                className={cx("h-full rounded-full", over ? "bg-text-error-primary" : "bg-accent-500")}
                style={{ width: `${Math.min(100, pct * 100)}%` }}
              />
            </div>
            {over && (
              <span className="flex items-center gap-1 text-caption-1-medium text-text-error-primary">
                <AlertTriangle className="size-3.5" aria-hidden /> Over by {formatINR(r.spent - r.budget)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Compact pot cards; overspent state is icon + label, never colour alone. */
export function PotBalanceCards({ pots }: { pots: PotSummary[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {pots.map((p) => {
        const over = p.balance < 0;
        const pct = p.budgetThisMonth > 0 ? Math.max(0, Math.min(1, p.balance / p.budgetThisMonth)) : 0;
        return (
          <li
            key={p.id}
            className={cx(
              "flex flex-col gap-3 rounded-2xl border bg-background-primary-default p-4",
              over ? "border-border-error-default" : "border-border-button-default",
            )}
          >
            <div className="flex items-center gap-2.5">
              <PotTile icon={p.icon} color={p.color} className="size-8" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-medium text-text-primary">{p.name}</span>
                <span className="truncate text-caption-1-regular text-text-tertiary">{p.bank}</span>
              </div>
              {over && (
                <Chip variant="caption" color="rose" className="shrink-0 gap-1">
                  <AlertTriangle className="size-3" aria-hidden /> Overspent
                </Chip>
              )}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <Money paise={p.balance} signed className="text-headline-semibold text-text-primary" />
              <span className="text-caption-1-regular text-text-tertiary">
                of {formatINR(p.budgetThisMonth)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-chart-track" aria-hidden>
              <div className="h-full rounded-full bg-accent-500" style={{ width: `${pct * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function RecentExpensesList({ rows }: { rows: RecentExpense[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-body-regular text-text-secondary">
        No expenses yet. <Link href="/expenses" className="text-accent-600 underline-offset-4 hover:underline">Add your first one</Link>.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-separator-border">
      {rows.map((e) => (
        <li key={e.id} className="flex items-center gap-3 py-2.5">
          <PotTile icon={e.potIcon} color={e.potColor} className="size-8" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-body-medium text-text-primary">{e.note ?? e.potName}</span>
            <span className="truncate text-caption-1-regular text-text-tertiary">
              {e.potName} · {e.paidViaLabel} · {formatDate(e.date, { weekday: true })}
            </span>
          </div>
          <Money paise={e.amountPaise} className="text-body-medium text-text-primary" />
        </li>
      ))}
    </ul>
  );
}
