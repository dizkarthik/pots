import type { Account } from "@/lib/db/schema";
import type { PotSummary } from "@/lib/queries/pots";

export interface LockerSummary {
  account: Account;
  pots: PotSummary[];
  /** Sum of this month's budgets across active pots. */
  monthlyBudget: number;
  /** Sum of all pot balances (archived pots still hold money). */
  potBalance: number;
  /** actual bank balance − pot balances; null when no bank balance is entered. */
  difference: number | null;
}

export function summariseLockers(accounts: Account[], pots: PotSummary[]): LockerSummary[] {
  return accounts.map((account) => {
    const own = pots.filter((p) => p.accountId === account.id);
    const potBalance = own.reduce((sum, p) => sum + p.balance, 0);
    return {
      account,
      pots: own,
      monthlyBudget: own.filter((p) => !p.isArchived).reduce((sum, p) => sum + p.budget, 0),
      potBalance,
      difference: account.actualBalancePaise === null ? null : account.actualBalancePaise - potBalance,
    };
  });
}

export type LockerSearchParams = { q?: string; type?: string; gap?: string; sort?: string };

export const LOCKER_SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "balance-desc", label: "Pot balance: high to low" },
  { value: "balance-asc", label: "Pot balance: low to high" },
  { value: "budget-desc", label: "Monthly budget: high to low" },
  { value: "budget-asc", label: "Monthly budget: low to high" },
];

export function filterAndSortLockers(lockers: LockerSummary[], sp: LockerSearchParams): LockerSummary[] {
  const q = sp.q?.trim().toLowerCase();
  const [field, direction] = (sp.sort ?? "name-asc").split("-");
  const dir = direction === "desc" ? -1 : 1;

  return lockers
    .filter((l) => {
      if (sp.type && l.account.type !== sp.type) return false;
      if (sp.gap === "shortfall" && !(l.difference !== null && l.difference < 0)) return false;
      if (sp.gap === "unallocated" && !(l.difference !== null && l.difference > 0)) return false;
      if (sp.gap === "untracked" && l.difference !== null) return false;
      if (q) {
        const haystack = [l.account.name, l.account.bank, ...l.pots.map((p) => p.name)].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const cmp =
        field === "balance"
          ? a.potBalance - b.potBalance
          : field === "budget"
            ? a.monthlyBudget - b.monthlyBudget
            : a.account.name.localeCompare(b.account.name);
      return cmp * dir || a.account.name.localeCompare(b.account.name);
    });
}
