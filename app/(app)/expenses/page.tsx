import { PageHeader } from "@/components/app-shell/page-header";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { ExpensesToolbar } from "@/components/expenses/expenses-toolbar";
import { MonthSwitcher } from "@/components/expenses/month-switcher";
import { parseExpenseFilters, type ExpenseSearchParams } from "@/lib/filters/expenses";
import { formatINR } from "@/lib/money";
import { currentMonth, todayIso } from "@/lib/month";
import { getExpenseOptions, getExpenses } from "@/lib/queries/expenses";

export const metadata = { title: "Expenses · Pots" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<ExpenseSearchParams> }) {
  const filters = parseExpenseFilters(await searchParams);
  const [{ rows, totalPaise }, options] = await Promise.all([getExpenses(filters), getExpenseOptions()]);
  const today = todayIso();

  return (
    <>
      <PageHeader title="Expenses" description="Everything you've spent, month by month." />
      <ExpensesToolbar pots={options.pots} paymentMethods={options.paymentMethods} range={filters.range} today={today} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSwitcher month={filters.month} currentMonth={currentMonth()} range={filters.range} />
        <p className="text-body-regular text-text-secondary" aria-live="polite">
          {rows.length} {rows.length === 1 ? "expense" : "expenses"} ·{" "}
          <span className="text-body-medium text-text-primary">{formatINR(totalPaise)}</span>
        </p>
      </div>
      <ExpensesTable rows={rows} pots={options.pots} paymentMethods={options.paymentMethods} today={today} />
    </>
  );
}
