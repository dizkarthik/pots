import { PageHeader } from "@/components/app-shell/page-header";
import { LockersView } from "@/components/lockers/lockers-view";
import { filterAndSortLockers, summariseLockers, type LockerSearchParams } from "@/lib/lockers";
import { formatMonth } from "@/lib/month";
import { getPotSummaries } from "@/lib/queries/pots";

export const metadata = { title: "Lockers · Pots" };

export default async function LockersPage({ searchParams }: { searchParams: Promise<LockerSearchParams> }) {
  const [params, { month, pots, accounts }] = await Promise.all([searchParams, getPotSummaries()]);
  const lockers = filterAndSortLockers(summariseLockers(accounts, pots), params);

  return (
    <>
      <PageHeader
        title="Lockers"
        description={`Bank accounts and the pots they hold, as of ${formatMonth(month)}.`}
      />
      <LockersView lockers={lockers} />
    </>
  );
}
