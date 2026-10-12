"use client";

import { parseDate } from "@internationalized/date";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { DateRangePicker } from "@/components/base/date-picker/date-range-picker";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { FilterSelect, ListToolbar, ParamInput, SearchFilter, useSetSearchParams } from "@/components/shared/list-toolbar";
import { EXPENSE_SORT_OPTIONS } from "@/lib/filters/expenses";
import type { PotOption } from "@/lib/queries/expenses";

const FILTER_PARAMS = ["q", "pot", "account", "from", "to", "min", "max"] as const;

export function ExpensesToolbar({
  pots,
  lockers,
  range,
  today,
}: {
  pots: PotOption[];
  lockers: { id: string; name: string }[];
  range: { from: string; to: string } | null;
  today: string;
}) {
  const [adding, setAdding] = useState(false);
  const { params, setMany } = useSetSearchParams();
  const hasFilters = FILTER_PARAMS.some((p) => params.get(p));
  const rupee = <span className="text-body-medium text-text-tertiary">₹</span>;

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
        <FilterSelect
          param="pot"
          label="Pot"
          options={[{ value: "all", label: "All pots" }, ...pots.map((p) => ({ value: p.id, label: p.name }))]}
        />
        <FilterSelect
          param="account"
          label="Bank account"
          options={[{ value: "all", label: "All lockers" }, ...lockers.map((l) => ({ value: l.id, label: l.name }))]}
        />
        <DateRangePicker
          aria-label="Date range"
          placeholder="Any date"
          value={range ? { start: parseDate(range.from), end: parseDate(range.to) } : null}
          onChange={(v) => setMany(v ? { from: v.start.toString(), to: v.end.toString() } : { from: null, to: null })}
        />
        <div className="flex items-center gap-1">
          <ParamInput param="min" label="Minimum amount" placeholder="Min" inputMode="decimal" leadingAddon={rupee} className="w-28" />
          <span className="text-text-tertiary" aria-hidden>
            –
          </span>
          <ParamInput param="max" label="Maximum amount" placeholder="Max" inputMode="decimal" leadingAddon={rupee} className="w-28" />
        </div>
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
        today={today}
        defaultPotId={params.get("pot") ?? undefined}
      />
    </>
  );
}
