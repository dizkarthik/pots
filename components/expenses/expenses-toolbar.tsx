"use client";

import { parseDate } from "@internationalized/date";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { DateRangePicker } from "@/components/base/date-picker/date-range-picker";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { PotMultiFilter } from "@/components/expenses/pot-multi-filter";
import { FilterSelect, ListToolbar, SearchFilter, useSetSearchParams } from "@/components/shared/list-toolbar";
import { EXPENSE_SORT_OPTIONS, parsePotIds } from "@/lib/filters/expenses";
import type { PaidViaOption } from "@/lib/payment-methods";
import type { PotOption } from "@/lib/queries/expenses";

const FILTER_PARAMS = ["q", "pot", "from", "to"] as const;

export function ExpensesToolbar({
  pots,
  paidViaOptions,
  range,
  today,
}: {
  pots: PotOption[];
  paidViaOptions: PaidViaOption[];
  range: { from: string; to: string } | null;
  today: string;
}) {
  const [adding, setAdding] = useState(false);
  const { params, setMany } = useSetSearchParams();
  const hasFilters = FILTER_PARAMS.some((p) => params.get(p));

  return (
    <>
      <ListToolbar
        actions={
          <Button leadingIcon={Plus} onClick={() => setAdding(true)}>
            Add expense
          </Button>
        }
      >
        <SearchFilter placeholder="Search notes or pots" />
        <PotMultiFilter pots={pots} />
        <DateRangePicker
          aria-label="Date range"
          placeholder="Any date"
          value={range ? { start: parseDate(range.from), end: parseDate(range.to) } : null}
          onChange={(v) => setMany(v ? { from: v.start.toString(), to: v.end.toString() } : { from: null, to: null })}
        />
        <FilterSelect param="sort" label="Sort by" options={EXPENSE_SORT_OPTIONS} className="min-w-44" />
        {hasFilters && (
          <Button
            variant="ghost"
            size="small"
            onClick={() => setMany(Object.fromEntries(FILTER_PARAMS.map((p) => [p, null])))}
          >
            Clear filters
          </Button>
        )}
      </ListToolbar>

      <ExpenseFormDialog
        isOpen={adding}
        onOpenChange={setAdding}
        expense={null}
        pots={pots}
        paidViaOptions={paidViaOptions}
        today={today}
        // Pre-select the pot when exactly one is being filtered.
        defaultPotId={parsePotIds(params.get("pot") ?? undefined).length === 1 ? params.get("pot")! : undefined}
      />
    </>
  );
}
