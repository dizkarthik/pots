import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { ChartCard, EmptyChart } from "@/components/dashboard/chart-card";
import { SpendByPotChart, SpendTrendChart } from "@/components/dashboard/charts";
import { BudgetVsActual, KpiRow, PotBalanceCards, RecentExpensesList } from "@/components/dashboard/sections";
import { budgetVsActualByLocker, monthTotals, potsNeedingAttention, spendByPot } from "@/lib/dashboard";
import { formatINR } from "@/lib/money";
import { formatMonth } from "@/lib/month";
import { getRecentExpenses, getSpendTrend } from "@/lib/queries/dashboard";
import { getPotSummaries } from "@/lib/queries/pots";

export const metadata = { title: "Dashboard · Pots" };

const linkClass = "text-body-medium text-accent-600 underline-offset-4 hover:underline";

export default async function DashboardPage() {
  const { month, pots } = await getPotSummaries();
  const [trend, recent] = await Promise.all([getSpendTrend(month, 6), getRecentExpenses(8)]);

  const totals = monthTotals(pots);
  const byPot = spendByPot(pots, 8);
  const byLocker = budgetVsActualByLocker(pots);
  const attention = potsNeedingAttention(pots, 12);
  const trendData = trend.map((t) => ({ label: formatMonth(t.month, { short: true }), spent: t.spent }));
  const monthLabel = formatMonth(month);

  return (
    <>
      <PageHeader title="Dashboard" description={`${monthLabel} at a glance.`} />

      <KpiRow totals={totals} monthLabel={monthLabel} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Spending trend" subtitle="Total spent per month, last 6 months">
          {trend.every((t) => t.spent === 0) ? (
            <EmptyChart>No spending recorded in the last 6 months yet.</EmptyChart>
          ) : (
            <SpendTrendChart data={trendData} />
          )}
          <DataTable caption="Spending per month" rows={trend.map((t) => [formatMonth(t.month), formatINR(t.spent)])} />
        </ChartCard>

        <ChartCard title="Spend by pot" subtitle={`${monthLabel} · top pots`}>
          {byPot.length === 0 ? (
            <EmptyChart>No spending this month yet.</EmptyChart>
          ) : (
            <SpendByPotChart data={byPot} />
          )}
          <DataTable caption="Spend by pot this month" rows={byPot.map((r) => [r.name, formatINR(r.spent)])} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <ChartCard title="Budget vs actual" subtitle={`Spent against budget per locker · ${monthLabel}`}>
          {byLocker.length === 0 ? <EmptyChart>No budgets yet.</EmptyChart> : <BudgetVsActual rows={byLocker} />}
        </ChartCard>

        <ChartCard title="Recent expenses" action={<Link href="/expenses" className={linkClass}>View all</Link>}>
          <RecentExpensesList rows={recent} />
        </ChartCard>
      </div>

      <ChartCard
        title="Pot balances"
        subtitle={
          totals.overspentCount > 0
            ? `${totals.overspentCount} overspent · showing the pots that need attention first`
            : "Lowest remaining first"
        }
        action={<Link href="/pots" className={linkClass}>All {pots.filter((p) => !p.isArchived).length} pots</Link>}
      >
        <PotBalanceCards pots={attention} />
      </ChartCard>
    </>
  );
}

/** Screen-reader table view of a chart's data (charts aren't the only way to read the numbers). */
function DataTable({ caption, rows }: { caption: string; rows: [string, string][] }) {
  if (rows.length === 0) return null;
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
