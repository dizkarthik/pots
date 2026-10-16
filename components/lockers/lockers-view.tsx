"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { AccountFormDialog } from "@/components/lockers/account-form-dialog";
import { FilterSelect, ListToolbar, SearchFilter } from "@/components/shared/list-toolbar";
import { Money } from "@/components/shared/money";
import type { Account } from "@/lib/db/schema";
import { LOCKER_SORT_OPTIONS, type LockerSummary } from "@/lib/lockers";

export function LockersView({ lockers }: { lockers: LockerSummary[] }) {
  // undefined = closed, null = creating, Account = editing
  const [editing, setEditing] = useState<Account | null | undefined>(undefined);

  return (
    <>
      <ListToolbar
        actions={
          <Button leadingIcon={Plus} onClick={() => setEditing(null)}>
            Add locker
          </Button>
        }
      >
        <SearchFilter placeholder="Search lockers or pots" />
        <FilterSelect param="sort" label="Sort by" options={LOCKER_SORT_OPTIONS} className="min-w-52" />
      </ListToolbar>

      {lockers.length === 0 ? (
        <p className="rounded-3xl border border-border-button-default py-12 text-center text-body-regular text-text-secondary">
          No lockers match these filters.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lockers.map((locker) => (
            <LockerCard key={locker.account.id} locker={locker} onEdit={() => setEditing(locker.account)} />
          ))}
        </div>
      )}

      <AccountFormDialog
        isOpen={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        account={editing ?? null}
      />
    </>
  );
}

function LockerCard({ locker, onEdit }: { locker: LockerSummary; onEdit: () => void }) {
  const { account, pots } = locker;
  const activeCount = pots.filter((p) => !p.isArchived).length;
  const archivedCount = pots.length - activeCount;
  return (
    <section
      aria-labelledby={`locker-${account.id}`}
      className="flex flex-col gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 id={`locker-${account.id}`} className="truncate text-headline-semibold text-text-primary">
              {account.bank}
            </h2>
            {account.isCredit && (
              <Chip variant="caption" color="purple" className="shrink-0 tracking-wide">
                CREDIT
              </Chip>
            )}
          </div>
          {account.notes && <p className="truncate text-body-regular text-text-tertiary">{account.notes}</p>}
        </div>
        <Button variant="ghost" size="small" iconOnly leadingIcon={Pencil} aria-label={`Edit ${account.bank}`} onClick={onEdit} />
      </header>

      <dl className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl bg-background-secondary-default p-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-caption-1-regular text-text-tertiary">Outstanding balance</dt>
          <dd>
            <Money paise={locker.totalBalance} signed className="text-title-2-semibold text-text-primary" />
          </dd>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <dt className="text-caption-1-regular text-text-tertiary">Pots</dt>
          <dd className="text-title-2-semibold text-text-primary tabular-nums">{activeCount}</dd>
          {archivedCount > 0 && <dd className="text-caption-1-regular text-text-tertiary">+{archivedCount} archived</dd>}
        </div>
      </dl>
    </section>
  );
}
