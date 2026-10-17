import type { VaultRow } from "@/lib/queries/vaults";

export type VaultSearchParams = { q?: string; month?: string; sort?: string };

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

export function filterAndSortVaults(rows: VaultRow[], sp: VaultSearchParams): VaultRow[] {
  const q = sp.q?.trim().toLowerCase();
  const [field, direction] = (sp.sort ?? "name-asc").split("-");
  const dir = direction === "desc" ? -1 : 1;

  return rows
    .filter((v) => {
      if (sp.month === "adjusted" && !v.thisMonth.adjusted) return false;
      if (sp.month === "skipped" && !(v.thisMonth.adjusted && v.thisMonth.amountPaise === 0)) return false;
      if (q && !v.name.toLowerCase().includes(q)) return false;
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
