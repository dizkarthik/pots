"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { PotFormDialog, type LockerOption } from "@/components/pots/pot-form-dialog";
import { FilterSelect, ListToolbar, SearchFilter } from "@/components/shared/list-toolbar";
import { POT_SORT_OPTIONS } from "@/lib/filters/pots";
import type { Month } from "@/lib/month";

export function PotsToolbar({ lockers, month, nextMonth }: { lockers: LockerOption[]; month: Month; nextMonth: Month }) {
  const [adding, setAdding] = useState(false);

  return (
    <>
      <ListToolbar
        actions={
          <Button leadingIcon={Plus} onClick={() => setAdding(true)} disabled={lockers.length === 0}>
            Add pot
          </Button>
        }
      >
        <SearchFilter placeholder="Search pots or lockers" />
        <FilterSelect
          param="account"
          label="Locker"
          options={[{ value: "all", label: "All lockers" }, ...lockers.map((l) => ({ value: l.id, label: l.bank }))]}
        />
        <FilterSelect
          param="status"
          label="Status"
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
            { value: "all", label: "Active & archived" },
          ]}
        />
        <FilterSelect
          param="overspent"
          label="Overspent"
          options={[
            { value: "any", label: "Any balance" },
            { value: "1", label: "Overspent only" },
          ]}
        />
        <FilterSelect param="sort" label="Sort by" options={POT_SORT_OPTIONS} className="min-w-48" />
      </ListToolbar>

      <PotFormDialog
        isOpen={adding}
        onOpenChange={setAdding}
        pot={null}
        lockers={lockers}
        month={month}
        nextMonth={nextMonth}
      />
    </>
  );
}
