"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Ellipsis, Pencil } from "lucide-react";
import type { SortDescriptor } from "react-aria-components";
import { Chip } from "@/components/base/badges/chip";
import { Dropdown, DropdownItem, DropdownPopover, DropdownTrigger } from "@/components/base/dropdown/dropdown";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@/components/base/table/table";
import { ChevronSortDown } from "@/components/foundations/icons/chevrons";
import { PotFormDialog, type LockerOption } from "@/components/pots/pot-form-dialog";
import { PotTile } from "@/components/pots/pot-tile";
import { useSearchParam } from "@/components/shared/list-toolbar";
import { Money } from "@/components/shared/money";
import { archivePot, unarchivePot } from "@/lib/actions/pots";
import { formatINR } from "@/lib/money";
import { formatMonth, type Month } from "@/lib/month";
import type { PotSummary } from "@/lib/queries/pots";
import { cx } from "@/utils/cx";
import { parsePotSort, type PotSortField } from "@/lib/filters/pots";

const SORTABLE: PotSortField[] = ["name", "budget", "spent", "balance"];

function SortableHeader({ label, direction }: { label: string; direction?: "ascending" | "descending" }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <ChevronSortDown
        className={cx(
          "size-3.5 transition-transform",
          direction ? "text-text-secondary" : "text-transparent group-hover:text-text-tertiary",
          direction === "ascending" && "rotate-180",
        )}
        aria-hidden
      />
    </span>
  );
}

export function PotsTable({
  pots,
  lockers,
  month,
  nextMonth,
}: {
  pots: PotSummary[];
  lockers: LockerOption[];
  month: Month;
  nextMonth: Month;
}) {
  const [editing, setEditing] = useState<PotSummary | null>(null);
  const sort = useSearchParam("sort");
  const { field, direction } = parsePotSort(sort.value ?? undefined);
  const sortDescriptor: SortDescriptor = { column: field, direction: direction === "asc" ? "ascending" : "descending" };

  const header = (id: PotSortField, label: string, end = false) => (
    <TableColumn
      id={id}
      allowsSorting
      isRowHeader={id === "name"}
      className={cx("group cursor-pointer", end && "text-end")}
    >
      {({ sortDirection }) => (
        <SortableHeader label={label} direction={sortDescriptor.column === id ? sortDirection : undefined} />
      )}
    </TableColumn>
  );

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default">
        <Table
          aria-label="Pots"
          sortDescriptor={sortDescriptor}
          onSortChange={(d) => {
            const f = String(d.column) as PotSortField;
            if (SORTABLE.includes(f)) sort.set(`${f}-${d.direction === "ascending" ? "asc" : "desc"}`);
          }}
        >
          <TableHeader>
            {header("name", "Pot")}
            <TableColumn>Locker</TableColumn>
            {header("budget", "Budget", true)}
            {header("spent", `Spent in ${formatMonth(month, { short: true })}`, true)}
            <TableColumn className="text-end">Carried over</TableColumn>
            {header("balance", "Balance", true)}
            <TableColumn className="w-12">
              <span className="sr-only">Actions</span>
            </TableColumn>
          </TableHeader>
          <TableBody
            items={pots}
            renderEmptyState={() => (
              <p className="py-10 text-center text-body-regular text-text-secondary">No pots match these filters.</p>
            )}
          >
            {(pot) => (
              <TableRow id={pot.id} className={cx(pot.isArchived && "text-text-secondary")}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <PotTile icon={pot.icon} color={pot.color} className={cx(pot.isArchived && "opacity-60")} />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-body-medium text-text-primary">{pot.name}</span>
                      {pot.isArchived && <span className="text-caption-1-regular text-text-tertiary">Archived</span>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-body-regular text-text-primary">{pot.bank}</span>
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex flex-col items-end gap-0.5">
                    <Money paise={pot.budget} />
                    {pot.upcoming && (
                      <span className="text-caption-1-regular text-status-blue-text">
                        {formatINR(pot.upcoming.amountPaise, { whole: true })} from{" "}
                        {formatMonth(pot.upcoming.effectiveFrom, { short: true })}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-end">
                  <Money paise={pot.spentThisMonth} />
                </TableCell>
                <TableCell className="text-end">
                  <Money paise={pot.carriedOver} signed />
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex flex-col items-end gap-0.5">
                    <Money paise={pot.balance} signed className="text-body-medium" />
                    {pot.balance < 0 && (
                      <Chip variant="caption" color="rose">
                        Overspent
                      </Chip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <PotActions pot={pot} onEdit={() => setEditing(pot)} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PotFormDialog
        isOpen={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        pot={editing}
        lockers={lockers}
        month={month}
        nextMonth={nextMonth}
      />
    </>
  );
}

function PotActions({ pot, onEdit }: { pot: PotSummary; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggleArchive = () =>
    startTransition(async () => {
      const result = pot.isArchived ? await unarchivePot(pot.id) : await archivePot(pot.id);
      setError(result.ok ? null : result.error);
      setOpen(false);
    });

  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <DropdownTrigger
        aria-label={`Actions for ${pot.name}`}
        isDisabled={isPending}
        className="flex size-8 items-center justify-center rounded-lg text-foreground-icon-secondary hover:bg-background-primary-hover"
      >
        <Ellipsis className="size-4" aria-hidden />
      </DropdownTrigger>
      <DropdownPopover aria-label={`Actions for ${pot.name}`} placement="bottom end" className="w-48">
        <DropdownItem
          onSelect={() => {
            setOpen(false);
            onEdit();
          }}
        >
          <Pencil className="size-4 text-foreground-icon-secondary" aria-hidden />
          Edit
        </DropdownItem>
        <DropdownItem onSelect={toggleArchive}>
          {pot.isArchived ? (
            <ArchiveRestore className="size-4 text-foreground-icon-secondary" aria-hidden />
          ) : (
            <Archive className="size-4 text-foreground-icon-secondary" aria-hidden />
          )}
          {pot.isArchived ? "Unarchive" : "Archive"}
        </DropdownItem>
        {error && <p className="px-2 text-caption-1-regular text-text-error-primary">{error}</p>}
      </DropdownPopover>
    </Dropdown>
  );
}
