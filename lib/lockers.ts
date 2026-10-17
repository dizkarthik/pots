import type { Account } from "@/lib/db/schema";
import type { PotSummary } from "@/lib/queries/pots";

export interface LockerSummary {
  account: Account;
  pots: PotSummary[];
  /**
   * Sum of the outstanding balances of every pot in this locker, archived
   * pots included (their money is still in the account). Overspent pots
   * reduce it.
   */
  potBalance: number;
  /** Invested total of vaults saved in this locker. */
  vaultInvested: number;
  vaultCount: number;
  /** Outstanding balance: potBalance + vaultInvested. */
  totalBalance: number;
  /**
   * Credit-card lockers only: total charged to the card in the viewed month
   * (expenses whose "Paid via" is this card, from any pot). null otherwise.
   */
  creditSpend: number | null;
}

/** The bits of a vault that count toward its locker's balance. */
export interface LinkedVault {
  accountId: string | null;
  investedTotal: number;
}

export function summariseLockers(
  accounts: Account[],
  pots: PotSummary[],
  creditSpend: ReadonlyMap<string, number> = new Map(),
  vaults: readonly LinkedVault[] = [],
): LockerSummary[] {
  return accounts.map((account) => {
    const own = pots.filter((p) => p.accountId === account.id);
    const linked = vaults.filter((v) => v.accountId === account.id);
    const potBalance = own.reduce((sum, p) => sum + p.balance, 0);
    const vaultInvested = linked.reduce((sum, v) => sum + v.investedTotal, 0);
    return {
      account,
      pots: own,
      potBalance,
      vaultInvested,
      vaultCount: linked.length,
      totalBalance: potBalance + vaultInvested,
      creditSpend: account.isCredit ? (creditSpend.get(account.id) ?? 0) : null,
    };
  });
}

export type LockerSearchParams = { q?: string; sort?: string };

export const LOCKER_SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "balance-desc", label: "Total balance: high to low" },
  { value: "balance-asc", label: "Total balance: low to high" },
];

export function filterAndSortLockers(lockers: LockerSummary[], sp: LockerSearchParams): LockerSummary[] {
  const q = sp.q?.trim().toLowerCase();
  const [field, direction] = (sp.sort ?? "name-asc").split("-");
  const dir = direction === "desc" ? -1 : 1;

  return lockers
    .filter((l) => {
      if (q) {
        const haystack = [l.account.bank, ...l.pots.map((p) => p.name)].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Credit-card lockers always come after bank lockers, whatever the sort.
      const credit = Number(a.account.isCredit) - Number(b.account.isCredit);
      if (credit) return credit;
      const cmp = field === "balance" ? a.totalBalance - b.totalBalance : a.account.bank.localeCompare(b.account.bank);
      return cmp * dir || a.account.bank.localeCompare(b.account.bank);
    });
}
