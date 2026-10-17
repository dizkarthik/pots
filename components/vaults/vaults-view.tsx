"use client";

import { useState } from "react";
import { Eye, Plus } from "lucide-react";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@/components/base/table/table";
import { PotTile } from "@/components/pots/pot-tile";
import { FilterSelect, ListToolbar, SearchFilter } from "@/components/shared/list-toolbar";
import { Money } from "@/components/shared/money";
import { VaultFormDialog } from "@/components/vaults/vault-form-dialog";
import { VaultViewDialog } from "@/components/vaults/vault-view-dialog";
import { VAULT_MONTH_FILTERS, VAULT_SORT_OPTIONS } from "@/lib/filters/vaults";
import { formatINR } from "@/lib/money";
import { formatMonth, type Month } from "@/lib/month";
import type { VaultRow } from "@/lib/queries/vaults";

export function VaultsView({
  vaults,
  month,
  lockers,
}: {
  vaults: VaultRow[];
  month: Month;
  lockers: { id: string; bank: string }[];
}) {
  // undefined = closed, null = creating, row = editing details
  const [editing, setEditing] = useState<VaultRow | null | undefined>(undefined);
  const [viewingId, setViewingId] = useState<string | null>(null);
  // Look the open vault up by id so the View stays current after each save.
  const viewing = vaults.find((v) => v.id === viewingId) ?? null;

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
            <TableColumn className="text-end">Months</TableColumn>
            <TableColumn className="text-end">Last month</TableColumn>
            <TableColumn className="text-end">Invested</TableColumn>
            <TableColumn className="w-24">
              <span className="sr-only">View</span>
            </TableColumn>
          </TableHeader>
          <TableBody
            items={vaults}
            renderEmptyState={() => (
              <p className="py-10 text-center text-body-regular text-text-secondary">No vaults match these filters.</p>
            )}
          >
            {(v) => {
              const last = v.lastMonth;
              const lastSkipped = last?.adjusted && last.amountPaise === 0;
              return (
                <TableRow id={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <PotTile icon={v.icon} color={v.color} />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-body-medium text-text-primary">{v.name}</span>
                        <span className="text-caption-1-regular text-text-tertiary">
                          Since {formatMonth(v.startMonth)}
                          {v.bank && ` · in ${v.bank}`}
                        </span>
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
                  <TableCell className="text-end tabular-nums">
                    {v.months} {v.months === 1 ? "month" : "months"}
                  </TableCell>
                  <TableCell className="text-end">
                    {last ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <Money paise={last.amountPaise} />
                        {last.adjusted && (
                          <Chip variant="caption" color={lastSkipped ? "neutral" : "blue"}>
                            {lastSkipped ? "Skipped" : "Edited"}
                          </Chip>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <Money paise={v.investedTotal} className="text-body-medium" />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="secondary"
                      size="small"
                      leadingIcon={Eye}
                      aria-label={`View ${v.name}`}
                      onClick={() => setViewingId(v.id)}
                    >
                      View
                    </Button>
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
        lockers={lockers}
      />
      <VaultViewDialog
        key={viewing?.id ?? "none"}
        vault={editing === undefined ? viewing : null}
        month={month}
        onClose={() => setViewingId(null)}
        onEditDetails={() => viewing && setEditing(viewing)}
      />
    </>
  );
}
