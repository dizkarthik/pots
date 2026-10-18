import { PageHeader } from "@/components/app-shell/page-header";
import { SettlementTable } from "@/components/settlement/settlement-table";
import { summariseLockers } from "@/lib/lockers";
import { currentMonth, formatMonth } from "@/lib/month";
import { getPotSummaries } from "@/lib/queries/pots";
import { getVaultSummaries } from "@/lib/queries/vaults";
import type { SettlementLocker } from "@/lib/settlement";

export const metadata = { title: "Settlement · Pots" };

export default async function SettlementPage() {
  const month = currentMonth();
  // Both reads in parallel: each is a slow round trip to the database.
  const [{ pots, accounts }, { vaults }] = await Promise.all([getPotSummaries(month), getVaultSummaries(month)]);
  // Credit cards hold no pots, so there's nothing to settle on them.
  const lockers: SettlementLocker[] = summariseLockers(accounts, pots, new Map(), vaults)
    .filter((l) => !l.account.isCredit)
    .map((l) => ({ id: l.account.id, bank: l.account.bank, outstanding: l.totalBalance }))
    .sort((a, b) => a.bank.localeCompare(b.bank));

  return (
    <>
      <PageHeader
        title="Settlement"
        description={`Enter what each bank shows today to see how much to move in or out of each locker (${formatMonth(month)}). Balances you type aren't saved.`}
      />
      <SettlementTable lockers={lockers} />
    </>
  );
}
