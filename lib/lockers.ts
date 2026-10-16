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
  totalBalance: number;
}

export function summariseLockers(accounts: Account[], pots: PotSummary[]): LockerSummary[] {
  return accounts.map((account) => {
    const own = pots.filter((p) => p.accountId === account.id);
    return { account, pots: own, totalBalance: own.reduce((sum, p) => sum + p.balance, 0) };
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
      const cmp = field === "balance" ? a.totalBalance - b.totalBalance : a.account.bank.localeCompare(b.account.bank);
      return cmp * dir || a.account.bank.localeCompare(b.account.bank);
    });
}
