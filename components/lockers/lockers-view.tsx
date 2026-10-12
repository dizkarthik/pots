"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { AccountFormDialog } from "@/components/lockers/account-form-dialog";
import { PotTile } from "@/components/pots/pot-tile";
import { FilterSelect, ListToolbar, SearchFilter } from "@/components/shared/list-toolbar";
import { Money } from "@/components/shared/money";
import type { Account } from "@/lib/db/schema";
import { LOCKER_SORT_OPTIONS, type LockerSummary } from "@/lib/lockers";
import { formatINR } from "@/lib/money";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from "@/lib/pot-options";
import { cx } from "@/utils/cx";

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
        <SearchFilter placeholder="Search lockers, banks or pots" />
        <FilterSelect
          param="type"
          label="Type"
          options={[{ value: "all", label: "All types" }, ...ACCOUNT_TYPES.map((t) => ({ value: t, label: ACCOUNT_TYPE_LABELS[t] }))]}
        />
        <FilterSelect
          param="gap"
          label="Bank balance"
          options={[
            { value: "any", label: "Any bank balance" },
            { value: "shortfall", label: "Shortfall" },
            { value: "unallocated", label: "Unallocated money" },
            { value: "untracked", label: "Balance not entered" },
          ]}
        />
        <FilterSelect param="sort" label="Sort by" options={LOCKER_SORT_OPTIONS} className="min-w-52" />
      </ListToolbar>

      {lockers.length === 0 ? (
        <p className="rounded-3xl border border-border-button-default py-12 text-center text-body-regular text-text-secondary">
          No lockers match these filters.
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
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

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-caption-1-regular text-text-tertiary">{label}</span>
      <span className="text-body-medium text-text-primary">{children}</span>
    </div>
  );
}

function BalanceComparison({ difference }: { difference: number | null }) {
  if (difference === null) return <span className="text-text-tertiary">Not entered</span>;
  if (difference === 0) return <Chip variant="caption" color="soft">Fully allocated</Chip>;
  return difference > 0 ? (
    <Chip variant="caption" color="lime">Unallocated {formatINR(difference, { whole: true })}</Chip>
  ) : (
    <Chip variant="caption" color="rose">Shortfall {formatINR(-difference, { whole: true })}</Chip>
  );
}

function LockerCard({ locker, onEdit }: { locker: LockerSummary; onEdit: () => void }) {
  const { account, pots } = locker;
  return (
    <section
      aria-labelledby={`locker-${account.id}`}
      className="flex flex-col gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 id={`locker-${account.id}`} className="truncate text-headline-semibold text-text-primary">
              {account.name}
            </h2>
            <Chip variant="caption" color="soft">
              {ACCOUNT_TYPE_LABELS[account.type]}
            </Chip>
          </div>
          <p className="text-body-regular text-text-secondary">
            {account.bank}
            {account.notes && <span className="text-text-tertiary"> · {account.notes}</span>}
          </p>
        </div>
        <Button variant="ghost" size="small" iconOnly leadingIcon={Pencil} aria-label={`Edit ${account.name}`} onClick={onEdit} />
      </header>

      <div className="grid grid-cols-2 gap-4 rounded-2xl bg-background-secondary-default p-4 sm:grid-cols-4">
        <Stat label="Monthly budget">
          <Money paise={locker.monthlyBudget} />
        </Stat>
        <Stat label="Pot balances">
          <Money paise={locker.potBalance} signed />
        </Stat>
        <Stat label="Bank balance">
          {account.actualBalancePaise === null ? <span className="text-text-tertiary">—</span> : <Money paise={account.actualBalancePaise} />}
        </Stat>
        <Stat label="Comparison">
          <BalanceComparison difference={locker.difference} />
        </Stat>
      </div>

      {pots.length === 0 ? (
        <p className="text-body-regular text-text-tertiary">No pots in this locker yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-separator-border">
          {pots.map((pot) => (
            <li key={pot.id} className={cx("flex items-center gap-3 py-2.5", pot.isArchived && "opacity-60")}>
              <PotTile icon={pot.icon} color={pot.color} className="size-8" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-medium text-text-primary">{pot.name}</span>
                <span className="text-caption-1-regular text-text-tertiary">
                  {pot.isArchived ? "Archived" : `${formatINR(pot.budget, { whole: true })} / month`}
                </span>
              </div>
              <Money paise={pot.balance} signed className="text-body-medium" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
