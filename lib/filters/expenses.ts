import { toPaise } from "@/lib/money";
import { compareMonths, currentMonth, firstDayOf, isIsoDate, isMonth, lastDayOf, type Month } from "@/lib/month";

export type ExpenseSearchParams = {
  month?: string;
  from?: string;
  to?: string;
  pot?: string;
  account?: string;
  min?: string;
  max?: string;
  q?: string;
  sort?: string;
};

export const EXPENSE_SORT_FIELDS = ["date", "amount", "pot"] as const;
export type ExpenseSortField = (typeof EXPENSE_SORT_FIELDS)[number];

export const EXPENSE_SORT_OPTIONS = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Amount: high to low" },
  { value: "amount-asc", label: "Amount: low to high" },
  { value: "pot-asc", label: "Pot (A–Z)" },
  { value: "pot-desc", label: "Pot (Z–A)" },
];

export interface ExpenseFilters {
  /** The month being browsed (ignored for the date bounds when a range is set). */
  month: Month;
  /** A custom date range replaces the month view while set. */
  range: { from: string; to: string } | null;
  /** Inclusive date bounds actually queried. */
  from: string;
  to: string;
  potId?: string;
  accountId?: string;
  minPaise?: number;
  maxPaise?: number;
  q?: string;
  sort: { field: ExpenseSortField; direction: "asc" | "desc" };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseExpenseSort(sort: string | undefined): ExpenseFilters["sort"] {
  const [field, direction] = (sort ?? "date-desc").split("-");
  if ((EXPENSE_SORT_FIELDS as readonly string[]).includes(field) && (direction === "asc" || direction === "desc")) {
    return { field: field as ExpenseSortField, direction };
  }
  return { field: "date", direction: "desc" };
}

/** Turns untrusted URL params into safe, typed filters; anything invalid is ignored. */
export function parseExpenseFilters(sp: ExpenseSearchParams, now = new Date()): ExpenseFilters {
  const thisMonth = currentMonth(now);
  // Future months hold no expenses, so browsing stops at the current month.
  const month = sp.month && isMonth(sp.month) && compareMonths(sp.month, thisMonth) <= 0 ? sp.month : thisMonth;

  const range =
    sp.from && sp.to && isIsoDate(sp.from) && isIsoDate(sp.to) && sp.from <= sp.to ? { from: sp.from, to: sp.to } : null;

  const min = sp.min ? toPaise(sp.min) : null;
  const max = sp.max ? toPaise(sp.max) : null;

  return {
    month,
    range,
    from: range?.from ?? firstDayOf(month),
    to: range?.to ?? lastDayOf(month),
    potId: sp.pot && UUID_RE.test(sp.pot) ? sp.pot : undefined,
    accountId: sp.account && UUID_RE.test(sp.account) ? sp.account : undefined,
    minPaise: min ?? undefined,
    maxPaise: max ?? undefined,
    q: sp.q?.trim() || undefined,
    sort: parseExpenseSort(sp.sort),
  };
}
