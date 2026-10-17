"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { Select, SelectItem } from "@/components/base/select/select";
import { Dialog } from "@/components/shared/dialog";
import { ColorPicker, IconPicker } from "@/components/shared/icon-color-pickers";
import { FieldError } from "@/components/shared/field-error";
import { createPot, updatePot } from "@/lib/actions/pots";
import type { ActionResult } from "@/lib/actions/result";
import { formatINR, paiseToInput } from "@/lib/money";
import { compareMonths, formatMonth, type Month } from "@/lib/month";
import { POT_COLORS, POT_ICON_NAMES, type PotColor, type PotIconName } from "@/lib/pot-options";
import type { PotSummary } from "@/lib/queries/pots";
import { potFormSchema, type PotFormValues } from "@/lib/validation/pots";
import { cx } from "@/utils/cx";

export interface LockerOption {
  id: string;
  bank: string;
}

function defaults(pot: PotSummary | null, lockers: LockerOption[]): PotFormValues {
  if (!pot) return { name: "", icon: "wallet", color: "chart-1", accountId: lockers[0]?.id ?? "", budget: "" };
  // Prefill the budget that will apply next month (a pending change if one
  // exists), so saving other fields never silently cancels it.
  const nextBudget = pot.upcoming?.amountPaise ?? pot.budget;
  return {
    name: pot.name,
    icon: (POT_ICON_NAMES as string[]).includes(pot.icon) ? (pot.icon as PotIconName) : "wallet",
    color: (POT_COLORS as readonly string[]).includes(pot.color) ? (pot.color as PotColor) : "chart-1",
    accountId: pot.accountId,
    budget: paiseToInput(nextBudget),
  };
}

export function PotFormDialog({
  isOpen,
  onOpenChange,
  pot,
  lockers,
  month,
  nextMonth,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create a new pot. */
  pot: PotSummary | null;
  lockers: LockerOption[];
  month: Month;
  nextMonth: Month;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PotFormValues>({ resolver: zodResolver(potFormSchema), defaultValues: defaults(pot, lockers) });
  const { control, handleSubmit, reset, setError, formState } = form;

  useEffect(() => {
    if (isOpen) reset(defaults(pot, lockers));
  }, [isOpen, pot, lockers, reset]);

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result: ActionResult = pot ? await updatePot(pot.id, values) : await createPot(values);
      if (result.ok) {
        onOpenChange(false);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof PotFormValues, { message });
      }
      setError("root", { message: result.error });
    }),
  );

  const budgetHint = pot
    ? `Applies from ${formatMonth(nextMonth)}. ${formatMonth(month)} keeps ${formatINR(pot.budget)}.`
    : `Starts this month — the full budget applies to ${formatMonth(month)}.`;

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={pot ? `Edit ${pot.name}` : "New pot"}
      description={pot ? undefined : "A spending category with a monthly budget."}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              label="Name"
              placeholder="e.g. Petrol"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="accountId"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1.5">
                <Label>Locker</Label>
                <Select
                  aria-label="Locker"
                  selectedKey={field.value || null}
                  onSelectionChange={(key) => field.onChange(String(key))}
                  isInvalid={fieldState.invalid}
                >
                  {lockers.map((l) => (
                    <SelectItem key={l.id} id={l.id}>
                      {l.bank}
                    </SelectItem>
                  ))}
                </Select>
                <FieldError>{fieldState.error?.message}</FieldError>
              </div>
            )}
          />
          <Controller
            control={control}
            name="budget"
            render={({ field, fieldState }) => (
              <Input
                label="Monthly budget"
                placeholder="0"
                inputMode="numeric"
                leadingAddon={<span className="text-body-medium text-text-tertiary">₹</span>}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                isInvalid={fieldState.invalid}
                validationBehavior="aria"
              />
            )}
          />
        </div>
        <p
          className={cx(
            "-mt-2 text-caption-1-regular",
            formState.errors.budget ? "text-text-error-primary" : "text-text-secondary",
          )}
        >
          {formState.errors.budget?.message ?? budgetHint}
        </p>

        <Controller
          control={control}
          name="icon"
          render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} />}
        />

        <Controller
          control={control}
          name="color"
          render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />}
        />

        {pot && <BudgetHistory pot={pot} month={month} />}

        {formState.errors.root && (
          <p role="alert" className="text-body-regular text-text-error-primary">
            {formState.errors.root.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : pot ? "Save changes" : "Create pot"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function BudgetHistory({ pot, month }: { pot: PotSummary; month: Month }) {
  const rows = [...pot.history].reverse();
  // The current row is the latest one that isn't in the future.
  const currentFrom = rows.find((r) => compareMonths(r.effectiveFrom, month) <= 0)?.effectiveFrom;

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Budget history</Label>
      <ul className="flex flex-col divide-y divide-separator-border rounded-2xl border border-border-button-default">
        {rows.map((row) => {
          const tag =
            compareMonths(row.effectiveFrom, month) > 0 ? "Upcoming" : row.effectiveFrom === currentFrom ? "Current" : null;
          return (
            <li key={row.effectiveFrom} className="flex items-center justify-between px-3 py-2 text-body-regular">
              <span className="text-text-secondary">From {formatMonth(row.effectiveFrom)}</span>
              <span className="flex items-center gap-2">
                {tag && (
                  <Chip variant="caption" color={tag === "Upcoming" ? "blue" : "soft"}>
                    {tag}
                  </Chip>
                )}
                <span className="tabular-nums text-text-primary">{formatINR(row.amountPaise)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
