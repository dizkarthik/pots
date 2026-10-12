import type { PotSummary } from "@/lib/queries/pots";

export type PotSearchParams = {
  q?: string;
  account?: string;
  status?: string;
  overspent?: string;
  sort?: string;
};

export const POT_SORT_FIELDS = {
  name: { label: "Name", get: (p: PotSummary) => p.name },
  budget: { label: "Budget", get: (p: PotSummary) => p.budget },
  spent: { label: "Spent", get: (p: PotSummary) => p.spentThisMonth },
  balance: { label: "Balance", get: (p: PotSummary) => p.balance },
} as const;
export type PotSortField = keyof typeof POT_SORT_FIELDS;
export type SortDirection = "asc" | "desc";

export const DEFAULT_POT_SORT = "name-asc";

/** "balance-desc" → { field: "balance", direction: "desc" }; falls back to name-asc. */
export function parsePotSort(sort: string | undefined): { field: PotSortField; direction: SortDirection } {
  const [field, direction] = (sort ?? DEFAULT_POT_SORT).split("-");
  if (field in POT_SORT_FIELDS && (direction === "asc" || direction === "desc")) {
    return { field: field as PotSortField, direction };
  }
  return { field: "name", direction: "asc" };
}

export const POT_SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "balance-desc", label: "Balance: high to low" },
  { value: "balance-asc", label: "Balance: low to high" },
  { value: "budget-desc", label: "Budget: high to low" },
  { value: "budget-asc", label: "Budget: low to high" },
  { value: "spent-desc", label: "Spent: high to low" },
  { value: "spent-asc", label: "Spent: low to high" },
];

export function filterAndSortPots(pots: PotSummary[], sp: PotSearchParams): PotSummary[] {
  const q = sp.q?.trim().toLowerCase();
  const status = sp.status ?? "active";
  const { field, direction } = parsePotSort(sp.sort);
  const get = POT_SORT_FIELDS[field].get;
  const dir = direction === "asc" ? 1 : -1;

  return pots
    .filter((p) => {
      if (status === "active" && p.isArchived) return false;
      if (status === "archived" && !p.isArchived) return false;
      if (sp.account && p.accountId !== sp.account) return false;
      if (sp.overspent === "1" && p.balance >= 0) return false;
      if (q && !`${p.name} ${p.accountName} ${p.bank}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
      return cmp * dir || a.name.localeCompare(b.name);
    });
}
