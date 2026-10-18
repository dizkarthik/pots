import { PageHeader } from "@/components/app-shell/page-header";
import { VaultsView } from "@/components/vaults/vaults-view";
import { filterAndSortVaults, parkedFilterOptions, type VaultSearchParams } from "@/lib/filters/vaults";
import { formatINR } from "@/lib/money";
import { formatMonth } from "@/lib/month";
import { getVaultSummaries } from "@/lib/queries/vaults";

export const metadata = { title: "Vaults · Pots" };

export default async function VaultsPage({ searchParams }: { searchParams: Promise<VaultSearchParams> }) {
  const [params, { month, vaults, bankLockers: lockers }] = await Promise.all([searchParams, getVaultSummaries()]);
  const visible = filterAndSortVaults(vaults, params);
  const totalInvested = vaults.reduce((s, v) => s + v.investedTotal, 0);
  const thisMonth = vaults.reduce((s, v) => s + v.thisMonth.amountPaise, 0);

  return (
    <>
      <PageHeader
        title="Vaults"
        description={`Your investments. Each vault's monthly amount is added automatically every month. ${formatMonth(month)}: ${formatINR(thisMonth)} · invested so far: ${formatINR(totalInvested)}.`}
      />
      <VaultsView vaults={visible} month={month} lockers={lockers} parkedOptions={parkedFilterOptions(vaults)} />
    </>
  );
}
