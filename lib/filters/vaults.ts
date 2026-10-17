import type { VaultRow } from "@/lib/queries/vaults";

export type FilterOptionList = { value: string; label: string }[];

export type VaultSearchParams = { q?: string; month?: string; parked?: string; sort?: string };

export const VAULT_MONTH_FILTERS = [
  { value: "all", label: "Any this month" },
  { value: "adjusted", label: "Adjusted this month" },
  { value: "skipped", label: "Skipped this month" },
];

export const VAULT_SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "invested-desc", label: "Invested: high to low" },
  { value: "invested-asc", label: "Invested: low to high" },
  { value: "monthly-desc", label: "Monthly: high to low" },
  { value: "monthly-asc", label: "Monthly: low to high" },
];

/** Parked filter options: groups first, then each place currently used by a vault. */
export function parkedFilterOptions(rows: VaultRow[]) {
  const places = new Map<string, string>();
  for (const v of rows) {
    if (v.accountId && v.parkedLabel) places.set(`a:${v.accountId}`, v.parkedLabel);
    else if (v.parkedIn) places.set(`i:${v.parkedIn}`, v.parkedIn);
  }
  return [
    { value: "all", label: "Parked anywhere" },
    { value: "any-locker", label: "Any locker" },
    { value: "any-investment", label: "Any investment" },
    { value: "unset", label: "Not set" },
    ...[...places].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
  ];
}

function matchesParked(v: VaultRow, parked: string | undefined): boolean {
  if (!parked || parked === "all") return true;
  if (parked === "any-locker") return v.accountId !== null;
  if (parked === "any-investment") return v.parkedIn !== null;
  if (parked === "unset") return v.accountId === null && v.parkedIn === null;
  if (parked.startsWith("a:")) return v.accountId === parked.slice(2);
  if (parked.startsWith("i:")) return v.parkedIn === parked.slice(2);
  return true;
}

export function filterAndSortVaults(rows: VaultRow[], sp: VaultSearchParams): VaultRow[] {
  const q = sp.q?.trim().toLowerCase();
  const [field, direction] = (sp.sort ?? "name-asc").split("-");
  const dir = direction === "desc" ? -1 : 1;

  return rows
    .filter((v) => {
      if (sp.month === "adjusted" && !v.thisMonth.adjusted) return false;
      if (sp.month === "skipped" && !(v.thisMonth.adjusted && v.thisMonth.amountPaise === 0)) return false;
      if (!matchesParked(v, sp.parked)) return false;
      if (q && !`${v.name} ${v.parkedLabel ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      const cmp =
        field === "invested"
          ? a.investedTotal - b.investedTotal
          : field === "monthly"
            ? a.monthly - b.monthly
            : a.name.localeCompare(b.name);
      return cmp * dir || a.name.localeCompare(b.name);
    });
}
