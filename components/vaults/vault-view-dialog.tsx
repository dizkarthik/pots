"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Check, Pencil, RotateCcw, TrendingDown, TrendingUp, X } from "lucide-react";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { Select, SelectItem } from "@/components/base/select/select";
import { Dialog } from "@/components/shared/dialog";
import { FieldError } from "@/components/shared/field-error";
import { Money } from "@/components/shared/money";
import { clearVaultAdjustment, setVaultAdjustment, stepVaultAmount } from "@/lib/actions/vaults";
import { formatINR, paiseToInput, toPaise } from "@/lib/money";
import { formatMonth, type Month } from "@/lib/month";
import type { VaultRow } from "@/lib/queries/vaults";
import { vaultStepSchema, type VaultStepValues } from "@/lib/validation/vaults";
import { stepStartMonths, vaultHistory, vaultMonth, type VaultMonth } from "@/lib/vaults";
import { cx } from "@/utils/cx";

/**
 * A vault's month-by-month view: summary, step up / down of the monthly
 * amount, and inline editing of what was invested in any month.
 */
export function VaultViewDialog({
  vault,
  month,
  onClose,
  onEditDetails,
}: {
  vault: VaultRow | null;
  month: Month;
  onClose: () => void;
  onEditDetails: () => void;
}) {
  // The parent keys this component by vault id, so local state resets per vault.
  const [stepping, setStepping] = useState(false);
  if (!vault) return null;

  const ledger = { startMonth: vault.startMonth, amounts: vault.history, adjustments: vault.adjustments };
  const rows = vaultHistory(ledger, month);

  return (
    <Dialog isOpen onOpenChange={(open) => !open && onClose()} title={vault.name} className="max-w-3xl">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-background-secondary-default p-4 sm:grid-cols-4">
          <Stat label="Monthly">
            <Money paise={vault.monthly} />
          </Stat>
          <Stat label="Months">
            {vault.months} {vault.months === 1 ? "month" : "months"}
          </Stat>
          <Stat label="Last month">{vault.lastMonth ? <Money paise={vault.lastMonth.amountPaise} /> : "—"}</Stat>
          <Stat label="Invested">
            <Money paise={vault.investedTotal} />
          </Stat>
        </div>
        {vault.upcoming && (
          <p className="-mt-2 text-caption-1-regular text-status-blue-text">
            Steps to {formatINR(vault.upcoming.amountPaise)} a month from {formatMonth(vault.upcoming.effectiveFrom)}.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="small" leadingIcon={TrendingUp} onClick={() => setStepping((s) => !s)}>
            Step up / down
          </Button>
          <Button variant="ghost" size="small" leadingIcon={Pencil} onClick={onEditDetails}>
            Edit details
          </Button>
        </div>

        {stepping && <StepForm vault={vault} month={month} onDone={() => setStepping(false)} />}

        <div className="flex flex-col gap-2">
          <h3 className="text-body-semibold text-text-primary">Month by month</h3>
          <ul className="flex max-h-[45vh] flex-col divide-y divide-separator-border overflow-y-auto rounded-2xl border border-border-button-default">
            {rows.map((r) => (
              <MonthRow key={r.month} vaultId={vault.id} row={r} note={vault.adjustments.find((a) => a.month === r.month)?.note ?? null} />
            ))}
          </ul>
        </div>
      </div>
    </Dialog>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-caption-1-regular text-text-tertiary">{label}</span>
      <span className="text-headline-semibold tabular-nums text-text-primary">{children}</span>
    </div>
  );
}

/** Step up / down: new monthly amount from a chosen month onward. */
function StepForm({ vault, month, onDone }: { vault: VaultRow; month: Month; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const months = stepStartMonths(vault.startMonth, month);
  const ledger = { startMonth: vault.startMonth, amounts: vault.history, adjustments: [] };
  const { control, handleSubmit, setError, formState, watch } = useForm<VaultStepValues>({
    resolver: zodResolver(vaultStepSchema),
    defaultValues: { from: months[0], amount: "" },
  });
  const from = watch("from") as Month;
  const amount = toPaise(watch("amount") ?? "");
  const current = vaultMonth(ledger, from).autoPaise;
  const direction = amount === null || amount === current ? null : amount > current ? "up" : "down";

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await stepVaultAmount(vault.id, values);
      if (result.ok) return onDone();
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof VaultStepValues, { message });
      }
      setError("root", { message: result.error });
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded-2xl border border-border-button-default p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Controller
          control={control}
          name="from"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label>From month</Label>
              <Select aria-label="From month" selectedKey={field.value} onSelectionChange={(k) => field.onChange(String(k))}>
                {months.map((m) => (
                  <SelectItem key={m} id={m}>
                    {formatMonth(m)}
                    {m === months[0] && <span className="text-text-tertiary"> · next month</span>}
                  </SelectItem>
                ))}
              </Select>
              <FieldError>{fieldState.error?.message}</FieldError>
            </div>
          )}
        />
        <Controller
          control={control}
          name="amount"
          render={({ field, fieldState }) => (
            <Input
              label="New monthly amount"
              placeholder="0"
              inputMode="numeric"
              leadingAddon={<span className="text-body-medium text-text-tertiary">₹</span>}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              isInvalid={fieldState.invalid}
              hint={fieldState.error?.message}
              validationBehavior="aria"
              autoFocus
            />
          )}
        />
      </div>
      <p className="flex items-center gap-1.5 text-caption-1-regular text-text-secondary">
        {direction === "up" && <TrendingUp className="size-3.5 text-accent-600" aria-hidden />}
        {direction === "down" && <TrendingDown className="size-3.5 text-text-error-primary" aria-hidden />}
        {formatINR(current)} a month
        {amount !== null && amount !== current
          ? ` → ${formatINR(amount)} from ${formatMonth(from)} onward (step ${direction}).`
          : ` in ${formatMonth(from)}. Applies to ${formatMonth(from)} and every month after it.`}
      </p>
      {formState.errors.root && (
        <p role="alert" className="text-body-regular text-text-error-primary">
          {formState.errors.root.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="small" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="small" disabled={isPending}>
          {isPending ? "Saving…" : "Save step"}
        </Button>
      </div>
    </form>
  );
}

/** One month: planned vs invested, editable inline (a one-off amount for that month only). */
function MonthRow({ vaultId, row, note }: { vaultId: string; row: VaultMonth; note: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(paiseToInput(row.amountPaise));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const skipped = row.adjusted && row.amountPaise === 0;

  const save = () =>
    startTransition(async () => {
      const result = await setVaultAdjustment(vaultId, { month: row.month, amount: value, note: note ?? "" });
      if (result.ok) {
        setEditing(false);
        setError(null);
      } else setError(result.fieldErrors?.amount ?? result.error);
    });
  const reset = () =>
    startTransition(async () => {
      const result = await clearVaultAdjustment(vaultId, row.month);
      if (!result.ok) setError(result.error);
    });

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2.5">
      <div className="flex min-w-32 flex-1 flex-col">
        <span className="text-body-medium text-text-primary">{formatMonth(row.month)}</span>
        <span className="text-caption-1-regular text-text-tertiary">
          Plan {formatINR(row.autoPaise)}
          {note && ` · ${note}`}
        </span>
      </div>

      {editing ? (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Input
            aria-label={`Invested in ${formatMonth(row.month)}`}
            inputMode="numeric"
            leadingAddon={<span className="text-body-medium text-text-tertiary">₹</span>}
            value={value}
            onChange={setValue}
            isInvalid={Boolean(error)}
            validationBehavior="aria"
            autoFocus
            className="w-32"
          />
          <Button type="submit" size="small" iconOnly leadingIcon={Check} aria-label="Save" disabled={isPending} />
          <Button
            size="small"
            variant="ghost"
            iconOnly
            leadingIcon={X}
            aria-label="Cancel"
            onClick={() => {
              setEditing(false);
              setValue(paiseToInput(row.amountPaise));
              setError(null);
            }}
          />
        </form>
      ) : (
        <>
          {row.adjusted && (
            <Chip variant="caption" color={skipped ? "neutral" : "blue"}>
              {skipped ? "Skipped" : "Edited"}
            </Chip>
          )}
          <Money paise={row.amountPaise} className={cx("w-24 text-end text-body-medium", skipped && "text-text-tertiary")} />
          <Button
            size="small"
            variant="ghost"
            iconOnly
            leadingIcon={Pencil}
            aria-label={`Edit ${formatMonth(row.month)}`}
            onClick={() => {
              setValue(paiseToInput(row.amountPaise));
              setEditing(true);
            }}
          />
          {row.adjusted ? (
            <Button
              size="small"
              variant="ghost"
              iconOnly
              leadingIcon={RotateCcw}
              aria-label={`Reset ${formatMonth(row.month)} to plan`}
              title="Reset to plan"
              onClick={reset}
              disabled={isPending}
            />
          ) : (
            <span className="size-8" aria-hidden />
          )}
        </>
      )}
      {error && <p role="alert" className="w-full text-caption-1-regular text-text-error-primary">{error}</p>}
    </li>
  );
}
