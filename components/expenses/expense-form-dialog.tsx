"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { parseDate } from "@internationalized/date";
import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/base/buttons/button";
import { DatePicker } from "@/components/base/date-picker/date-picker";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { Select, SelectItem } from "@/components/base/select/select";
import { PaymentMethodField } from "@/components/expenses/payment-method-field";
import { PotTile } from "@/components/pots/pot-tile";
import { Dialog } from "@/components/shared/dialog";
import { FieldError } from "@/components/shared/field-error";
import { createExpense, updateExpense } from "@/lib/actions/expenses";
import { paiseToInput } from "@/lib/money";
import type { ExpenseRow, PaymentMethodOption, PotOption } from "@/lib/queries/expenses";
import { expenseFormSchema, type ExpenseFormValues } from "@/lib/validation/expenses";

function defaults(expense: ExpenseRow | null, today: string, defaultPotId?: string): ExpenseFormValues {
  if (expense) {
    return {
      date: expense.date,
      amount: paiseToInput(expense.amountPaise),
      potId: expense.potId,
      paymentMethodId: expense.paymentMethodId,
      note: expense.note ?? "",
    };
  }
  return { date: today, amount: "", potId: defaultPotId ?? "", paymentMethodId: "", note: "" };
}

export function ExpenseFormDialog({
  isOpen,
  onOpenChange,
  expense,
  pots,
  paymentMethods,
  today,
  defaultPotId,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = add a new expense. */
  expense: ExpenseRow | null;
  pots: PotOption[];
  paymentMethods: PaymentMethodOption[];
  /** Today in India time, from the server. */
  today: string;
  defaultPotId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { control, handleSubmit, reset, setError, formState } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: defaults(expense, today, defaultPotId),
  });

  useEffect(() => {
    if (isOpen) reset(defaults(expense, today, defaultPotId));
  }, [isOpen, expense, today, defaultPotId, reset]);

  // Archived pots can't take new expenses, but an existing expense keeps its pot.
  const choosable = pots.filter((p) => !p.isArchived || p.id === expense?.potId);

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = expense ? await updateExpense(expense.id, values) : await createExpense(values);
      if (result.ok) {
        onOpenChange(false);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof ExpenseFormValues, { message });
      }
      setError("root", { message: result.error });
    }),
  );

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} title={expense ? "Edit expense" : "Add expense"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="amount"
            render={({ field, fieldState }) => (
              <Input
                label="Amount"
                placeholder="0.00"
                inputMode="decimal"
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
          <Controller
            control={control}
            name="date"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1.5">
                <Label>Date</Label>
                <DatePicker
                  aria-label="Date"
                  value={field.value ? parseDate(field.value) : null}
                  onChange={(d) => field.onChange(d ? d.toString() : "")}
                  maxValue={parseDate(today)}
                  className="w-full justify-start"
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </div>
            )}
          />
        </div>

        <Controller
          control={control}
          name="potId"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label>Pot</Label>
              <Select
                aria-label="Pot"
                placeholder="Choose a pot"
                selectedKey={field.value || null}
                onSelectionChange={(key) => field.onChange(String(key))}
                isInvalid={fieldState.invalid}
              >
                {choosable.map((p) => (
                  <SelectItem key={p.id} id={p.id} textValue={p.name}>
                    <PotTile icon={p.icon} color={p.color} className="size-6 rounded-lg [&_svg]:size-3.5" />
                    {p.name}
                  </SelectItem>
                ))}
              </Select>
              <FieldError>{fieldState.error?.message}</FieldError>
            </div>
          )}
        />

        <Controller
          control={control}
          name="paymentMethodId"
          render={({ field, fieldState }) => (
            <PaymentMethodField
              methods={paymentMethods}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="note"
          render={({ field, fieldState }) => (
            <Input
              label="Note"
              placeholder="Optional, e.g. Indian Oil, Koramangala"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              isInvalid={fieldState.invalid}
              hint={fieldState.error?.message}
              validationBehavior="aria"
            />
          )}
        />

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
            {isPending ? "Saving…" : expense ? "Save changes" : "Add expense"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
