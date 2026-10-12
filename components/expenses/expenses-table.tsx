"use client";

import { useState, useTransition } from "react";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import type { SortDescriptor } from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { Dropdown, DropdownItem, DropdownPopover, DropdownTrigger } from "@/components/base/dropdown/dropdown";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@/components/base/table/table";
import { ChevronSortDown } from "@/components/foundations/icons/chevrons";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { PotTile } from "@/components/pots/pot-tile";
import { Dialog } from "@/components/shared/dialog";
import { useSearchParam } from "@/components/shared/list-toolbar";
import { Money } from "@/components/shared/money";
import { deleteExpense } from "@/lib/actions/expenses";
import { EXPENSE_SORT_FIELDS, parseExpenseSort, type ExpenseSortField } from "@/lib/filters/expenses";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/month";
import type { ExpenseRow, PotOption } from "@/lib/queries/expenses";
import { cx } from "@/utils/cx";

function SortLabel({ label, direction }: { label: string; direction?: "ascending" | "descending" }) {
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

export function ExpensesTable({ rows, pots, today }: { rows: ExpenseRow[]; pots: PotOption[]; today: string }) {
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null);
  const sort = useSearchParam("sort");
  const { field, direction } = parseExpenseSort(sort.value ?? undefined);
  const sortDescriptor: SortDescriptor = { column: field, direction: direction === "asc" ? "ascending" : "descending" };

  const sortable = (id: ExpenseSortField, label: string, opts: { end?: boolean; rowHeader?: boolean } = {}) => (
    <TableColumn
      id={id}
      allowsSorting
      isRowHeader={opts.rowHeader}
      className={cx("group cursor-pointer", opts.end && "text-end")}
    >
      {({ sortDirection }) => <SortLabel label={label} direction={sortDescriptor.column === id ? sortDirection : undefined} />}
    </TableColumn>
  );

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default">
        <Table
          aria-label="Expenses"
          sortDescriptor={sortDescriptor}
          onSortChange={(d) => {
            const f = String(d.column);
            if ((EXPENSE_SORT_FIELDS as readonly string[]).includes(f)) {
              sort.set(`${f}-${d.direction === "ascending" ? "asc" : "desc"}`);
            }
          }}
        >
          <TableHeader>
            {sortable("date", "Date", { rowHeader: true })}
            {sortable("pot", "Pot")}
            <TableColumn>Locker</TableColumn>
            <TableColumn>Note</TableColumn>
            {sortable("amount", "Amount", { end: true })}
            <TableColumn className="w-12">
              <span className="sr-only">Actions</span>
            </TableColumn>
          </TableHeader>
          <TableBody
            items={rows}
            renderEmptyState={() => (
              <p className="py-10 text-center text-body-regular text-text-secondary">No expenses match these filters.</p>
            )}
          >
            {(row) => (
              <TableRow id={row.id}>
                <TableCell className="whitespace-nowrap text-text-secondary">{formatDate(row.date, { weekday: true })}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <PotTile icon={row.potIcon} color={row.potColor} className="size-8" />
                    <span className="text-body-medium text-text-primary">{row.potName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-body-regular text-text-primary">{row.accountName}</span>
                    <span className="text-caption-1-regular text-text-tertiary">{row.bank}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-64 truncate text-text-secondary">{row.note ?? "—"}</TableCell>
                <TableCell className="text-end">
                  <Money paise={row.amountPaise} className="text-body-medium" />
                </TableCell>
                <TableCell>
                  <RowActions row={row} onEdit={() => setEditing(row)} onDelete={() => setDeleting(row)} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ExpenseFormDialog
        isOpen={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        expense={editing}
        pots={pots}
        today={today}
      />
      <DeleteExpenseDialog expense={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

function RowActions({ row, onEdit, onDelete }: { row: ExpenseRow; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const label = `Actions for ${row.potName} expense on ${formatDate(row.date)}`;
  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <DropdownTrigger
        aria-label={label}
        className="flex size-8 items-center justify-center rounded-lg text-foreground-icon-secondary hover:bg-background-primary-hover"
      >
        <Ellipsis className="size-4" aria-hidden />
      </DropdownTrigger>
      <DropdownPopover aria-label={label} placement="bottom end" className="w-44">
        <DropdownItem
          onSelect={() => {
            setOpen(false);
            onEdit();
          }}
        >
          <Pencil className="size-4 text-foreground-icon-secondary" aria-hidden />
          Edit
        </DropdownItem>
        <DropdownItem
          onSelect={() => {
            setOpen(false);
            onDelete();
          }}
          className="text-text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
          Delete
        </DropdownItem>
      </DropdownPopover>
    </Dropdown>
  );
}

function DeleteExpenseDialog({ expense, onClose }: { expense: ExpenseRow | null; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirm = () =>
    startTransition(async () => {
      if (!expense) return;
      const result = await deleteExpense(expense.id);
      if (result.ok) {
        setError(null);
        onClose();
      } else {
        setError(result.error);
      }
    });

  return (
    <Dialog
      isOpen={expense !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Delete this expense?"
      className="max-w-md"
      description={
        expense &&
        `${formatINR(expense.amountPaise)} from ${expense.potName} on ${formatDate(expense.date, { year: true })}. The pot's balance will go back up by this amount. This can't be undone.`
      }
    >
      {error && (
        <p role="alert" className="text-body-regular text-text-error-primary">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={confirm} disabled={isPending}>
          {isPending ? "Deleting…" : "Delete expense"}
        </Button>
      </div>
    </Dialog>
  );
}
