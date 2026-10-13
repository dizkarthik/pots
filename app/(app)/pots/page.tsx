import { PageHeader } from "@/components/app-shell/page-header";
import { PotsTable } from "@/components/pots/pots-table";
import { PotsToolbar } from "@/components/pots/pots-toolbar";
import { filterAndSortPots, type PotSearchParams } from "@/lib/filters/pots";
import { addMonths, formatMonth } from "@/lib/month";
import { getPotSummaries } from "@/lib/queries/pots";

export const metadata = { title: "Pots · Pots" };

export default async function PotsPage({ searchParams }: { searchParams: Promise<PotSearchParams> }) {
  const [params, { month, pots, accounts }] = await Promise.all([searchParams, getPotSummaries()]);
  const nextMonth = addMonths(month, 1);
  const lockers = accounts.map((a) => ({ id: a.id, bank: a.bank }));
  const visible = filterAndSortPots(pots, params);

  return (
    <>
      <PageHeader
        title="Pots"
        description={`Spending categories and their balances for ${formatMonth(month)}. Budget changes apply from the 1st of next month.`}
      />
      <PotsToolbar lockers={lockers} month={month} nextMonth={nextMonth} />
      <PotsTable pots={visible} lockers={lockers} month={month} nextMonth={nextMonth} />
    </>
  );
}
