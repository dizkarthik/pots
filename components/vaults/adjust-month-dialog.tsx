"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { Select, SelectItem } from "@/components/base/select/select";
import { Dialog } from "@/components/shared/dialog";
import { FieldError } from "@/components/shared/field-error";
import { clearVaultAdjustment, setVaultAdjustment } from "@/lib/actions/vaults";
import { formatINR, paiseToInput } from "@/lib/money";
import { formatMonth, type Month } from "@/lib/month";
import type { VaultRow } from "@/lib/queries/vaults";
import { vaultAdjustmentSchema, type VaultAdjustmentValues } from "@/lib/validation/vaults";
import { adjustableMonths, vaultMonth } from "@/lib/vaults";

/**
 * Set a one-off amount for a single month (₹0 = skipped), or reset a month
 * back to the automatic monthly amount.
 */
export function AdjustMonthDialog({
  vault,
  currentMonth,
  onClose,
}: {
  vault: VaultRow | null;
  currentMonth: Month;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [resetError, setResetError] = useState<string | null>(null);
  const months = vault ? adjustableMonths(vault.startMonth, currentMonth) : [];
  const ledger = vault ? { startMonth: vault.startMonth, amounts: vault.history, adjustments: vault.adjustments } : null;

  const defaults = (m: Month): VaultAdjustmentValues => {
    const line = ledger ? vaultMonth(ledger, m) : null;
    return { month: m, amount: line ? paiseToInput(line.amountPaise) : "", note: vault?.adjustments.find((a) => a.month === m)?.note ?? "" };
  };

  const { control, handleSubmit, reset, setError, formState } = useForm<VaultAdjustmentValues>({
    resolver: zodResolver(vaultAdjustmentSchema),
    defaultValues: defaults(currentMonth),
  });
  const selectedMonth = useWatch({ control, name: "month" }) as Month;
  const line = ledger && selectedMonth ? vaultMonth(ledger, selectedMonth) : null;

  useEffect(() => {
    if (vault) {
      reset(defaults(currentMonth));
      setResetError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when a different vault opens
  }, [vault?.id]);

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      if (!vault) return;
      const result = await setVaultAdjustment(vault.id, values);
      if (result.ok) return onClose();
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof VaultAdjustmentValues, { message });
      }
      setError("root", { message: result.error });
    }),
  );

  const resetToAuto = () =>
    startTransition(async () => {
      if (!vault) return;
      const result = await clearVaultAdjustment(vault.id, selectedMonth);
      if (result.ok) onClose();
      else setResetError(result.error);
    });

  return (
    <Dialog
      isOpen={vault !== null}
      onOpenChange={(open) => !open && onClose()}
      title={vault ? `Adjust ${vault.name}` : "Adjust a month"}
      description="Change what was invested in one month only. Enter 0 if the month was skipped."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="month"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1.5">
                <Label>Month</Label>
                <Select
                  aria-label="Month"
                  selectedKey={field.value}
                  onSelectionChange={(key) => reset(defaults(String(key) as Month))}
                  isInvalid={fieldState.invalid}
                >
                  {months.map((m) => (
                    <SelectItem key={m} id={m}>
                      {formatMonth(m)}
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
                label="Amount invested"
                placeholder="0"
                inputMode="numeric"
                leadingAddon={<span className="text-body-medium text-text-tertiary">₹</span>}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                isInvalid={fieldState.invalid}
                hint={fieldState.error?.message}
                validationBehavior="aria"
              />
            )}
          />
        </div>
        {line && (
          <p className="-mt-2 text-caption-1-regular text-text-secondary">
            Automatic amount for {formatMonth(selectedMonth)}: {formatINR(line.autoPaise)}
            {line.adjusted && ` · currently adjusted to ${formatINR(line.amountPaise)}`}
          </p>
        )}
        <Controller
          control={control}
          name="note"
          render={({ field, fieldState }) => (
            <Input
              label="Note"
              placeholder="Optional, e.g. Missed SIP, Diwali top-up"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              isInvalid={fieldState.invalid}
              hint={fieldState.error?.message}
              validationBehavior="aria"
            />
          )}
        />

        {(formState.errors.root || resetError) && (
          <p role="alert" className="text-body-regular text-text-error-primary">
            {resetError ?? formState.errors.root?.message}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {line?.adjusted ? (
            <Button variant="ghost" onClick={resetToAuto} disabled={isPending}>
              Reset to automatic
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save adjustment"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
