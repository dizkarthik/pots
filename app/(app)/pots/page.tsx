import { PageHeader } from "@/components/app-shell/page-header";
import { AllocationPanel } from "@/components/pots/allocation-panel";
import { PotsTable } from "@/components/pots/pots-table";
import { PotsToolbar } from "@/components/pots/pots-toolbar";
import { nextAllocationMonth, pendingAllocationMonths } from "@/lib/allocation";
import { filterAndSortPots, type PotSearchParams } from "@/lib/filters/pots";
import { addMonths, formatMonth } from "@/lib/month";
import { getPotSummaries } from "@/lib/queries/pots";

export const metadata = { title: "Pots · Pots" };

export default async function PotsPage({ searchParams }: { searchParams: Promise<PotSearchParams> }) {
  const [params, { month, pots, accounts, allocatedMonths }] = await Promise.all([searchParams, getPotSummaries()]);
  const nextMonth = addMonths(month, 1);
  // Credit-card lockers can't hold pots, so they're not offered here.
  const lockers = accounts.filter((a) => !a.isCredit).map((a) => ({ id: a.id, bank: a.bank }));
  const visible = filterAndSortPots(pots, params);
  const pending = pendingAllocationMonths(allocatedMonths, month);
  const next = nextAllocationMonth(month);

  return (
    <>
      <PageHeader
        title="Pots"
        description={`Spending categories and their balances for ${formatMonth(month)}. From November, each month's budgets reach the pots when you allocate them.`}
      />
      <AllocationPanel
        // Remount when the offered month changes so the edited amounts reset.
        key={pending[0] ?? next}
        pots={pots}
        pending={pending}
        nextMonth={next}
        currentAllocated={allocatedMonths.includes(month)}
        month={month}
      />
      <PotsToolbar lockers={lockers} month={month} nextMonth={nextMonth} />
      <PotsTable pots={visible} lockers={lockers} month={month} nextMonth={nextMonth} />
    </>
  );
}
