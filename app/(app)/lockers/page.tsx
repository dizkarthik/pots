import { PageHeader } from "@/components/app-shell/page-header";
import { LockersView } from "@/components/lockers/lockers-view";
import { filterAndSortLockers, summariseLockers, type LockerSearchParams } from "@/lib/lockers";
import { currentMonth, formatMonth } from "@/lib/month";
import { getCreditCardSpend } from "@/lib/queries/lockers";
import { getPotSummaries } from "@/lib/queries/pots";
import { getVaultSummaries } from "@/lib/queries/vaults";

export const metadata = { title: "Lockers · Pots" };

export default async function LockersPage({ searchParams }: { searchParams: Promise<LockerSearchParams> }) {
  const month = currentMonth();
  // All reads in parallel: each is a slow round trip to the database.
  const [params, { pots, accounts }, creditSpend, { vaults }] = await Promise.all([
    searchParams,
    getPotSummaries(month),
    getCreditCardSpend(month),
    getVaultSummaries(month),
  ]);
  const lockers = filterAndSortLockers(summariseLockers(accounts, pots, creditSpend, vaults), params);

  return (
    <>
      <PageHeader
        title="Lockers"
        description={`Bank accounts and their pots, plus what you spent on each credit card in ${formatMonth(month)}.`}
      />
      <LockersView lockers={lockers} monthLabel={formatMonth(month)} />
    </>
  );
}
