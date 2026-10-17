"use client";

import { useState } from "react";
import { CalendarCog, Ellipsis, Pencil, Plus } from "lucide-react";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { Dropdown, DropdownItem, DropdownPopover, DropdownTrigger } from "@/components/base/dropdown/dropdown";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@/components/base/table/table";
import { PotTile } from "@/components/pots/pot-tile";
import { FilterSelect, ListToolbar, SearchFilter } from "@/components/shared/list-toolbar";
import { Money } from "@/components/shared/money";
import { AdjustMonthDialog } from "@/components/vaults/adjust-month-dialog";
import { VaultFormDialog } from "@/components/vaults/vault-form-dialog";
import { VAULT_MONTH_FILTERS, VAULT_SORT_OPTIONS } from "@/lib/filters/vaults";
import { formatINR } from "@/lib/money";
import { formatMonth, type Month } from "@/lib/month";
import type { VaultRow } from "@/lib/queries/vaults";

export function VaultsView({ vaults, month, nextMonth }: { vaults: VaultRow[]; month: Month; nextMonth: Month }) {
  // undefined = closed, null = creating, row = editing
  const [editing, setEditing] = useState<VaultRow | null | undefined>(undefined);
  const [adjusting, setAdjusting] = useState<VaultRow | null>(null);

  return (
    <>
      <ListToolbar
        actions={
          <Button leadingIcon={Plus} onClick={() => setEditing(null)}>
            Add vault
          </Button>
        }
      >
        <SearchFilter placeholder="Search vaults" />
        <FilterSelect param="month" label="This month" options={VAULT_MONTH_FILTERS} className="min-w-48" />
        <FilterSelect param="sort" label="Sort by" options={VAULT_SORT_OPTIONS} className="min-w-48" />
      </ListToolbar>

      <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default">
        <Table aria-label="Vaults">
          <TableHeader>
            <TableColumn isRowHeader>Vault</TableColumn>
            <TableColumn className="text-end">Monthly</TableColumn>
            <TableColumn className="text-end">{formatMonth(month)}</TableColumn>
            <TableColumn className="text-end">Invested so far</TableColumn>
            <TableColumn className="w-12">
              <span className="sr-only">Actions</span>
            </TableColumn>
          </TableHeader>
          <TableBody
            items={vaults}
            renderEmptyState={() => (
              <p className="py-10 text-center text-body-regular text-text-secondary">No vaults match these filters.</p>
            )}
          >
            {(v) => {
              const skipped = v.thisMonth.adjusted && v.thisMonth.amountPaise === 0;
              return (
                <TableRow id={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <PotTile icon={v.icon} color={v.color} />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-body-medium text-text-primary">{v.name}</span>
                        <span className="text-caption-1-regular text-text-tertiary">Since {formatMonth(v.startMonth)}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex flex-col items-end gap-0.5">
                      <Money paise={v.monthly} />
                      {v.upcoming && (
                        <span className="text-caption-1-regular text-status-blue-text">
                          {formatINR(v.upcoming.amountPaise)} from {formatMonth(v.upcoming.effectiveFrom, { short: true })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex flex-col items-end gap-0.5">
                      <Money paise={v.thisMonth.amountPaise} />
                      {v.thisMonth.adjusted && (
                        <Chip variant="caption" color={skipped ? "neutral" : "blue"}>
                          {skipped ? "Skipped" : "Adjusted"}
                        </Chip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-end">
                    <Money paise={v.investedTotal} className="text-body-medium" />
                  </TableCell>
                  <TableCell>
                    <VaultActions vault={v} onEdit={() => setEditing(v)} onAdjust={() => setAdjusting(v)} />
                  </TableCell>
                </TableRow>
              );
            }}
          </TableBody>
        </Table>
      </div>

      <VaultFormDialog
        isOpen={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        vault={editing ?? null}
        month={month}
        nextMonth={nextMonth}
      />
      <AdjustMonthDialog vault={adjusting} currentMonth={month} onClose={() => setAdjusting(null)} />
    </>
  );
}

function VaultActions({ vault, onEdit, onAdjust }: { vault: VaultRow; onEdit: () => void; onAdjust: () => void }) {
  const [open, setOpen] = useState(false);
  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <DropdownTrigger
        aria-label={`Actions for ${vault.name}`}
        className="flex size-8 items-center justify-center rounded-lg text-foreground-icon-secondary hover:bg-background-primary-hover"
      >
        <Ellipsis className="size-4" aria-hidden />
      </DropdownTrigger>
      <DropdownPopover aria-label={`Actions for ${vault.name}`} placement="bottom end" className="w-52">
        <DropdownItem onSelect={pick(onEdit)}>
          <Pencil className="size-4 text-foreground-icon-secondary" aria-hidden />
          Edit
        </DropdownItem>
        <DropdownItem onSelect={pick(onAdjust)}>
          <CalendarCog className="size-4 text-foreground-icon-secondary" aria-hidden />
          Adjust a month
        </DropdownItem>
      </DropdownPopover>
    </Dropdown>
  );
}
