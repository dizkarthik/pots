"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { Select, SelectItem } from "@/components/base/select/select";
import { Textarea } from "@/components/base/textarea/textarea";
import { Dialog } from "@/components/shared/dialog";
import { createAccount, updateAccount } from "@/lib/actions/accounts";
import type { Account } from "@/lib/db/schema";
import { paiseToInput } from "@/lib/money";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from "@/lib/pot-options";
import { accountFormSchema, type AccountFormValues } from "@/lib/validation/accounts";

function defaults(account: Account | null): AccountFormValues {
  return {
    name: account?.name ?? "",
    bank: account?.bank ?? "",
    type: account?.type ?? "savings",
    notes: account?.notes ?? "",
    actualBalance: account?.actualBalancePaise == null ? "" : paiseToInput(account.actualBalancePaise),
  };
}

export function AccountFormDialog({
  isOpen,
  onOpenChange,
  account,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create a new locker. */
  account: Account | null;
}) {
  const [isPending, startTransition] = useTransition();
  const { control, handleSubmit, reset, setError, formState } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: defaults(account),
  });

  useEffect(() => {
    if (isOpen) reset(defaults(account));
  }, [isOpen, account, reset]);

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = account ? await updateAccount(account.id, values) : await createAccount(values);
      if (result.ok) {
        onOpenChange(false);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof AccountFormValues, { message });
      }
      setError("root", { message: result.error });
    }),
  );

  const text = (name: "name" | "bank", label: string, placeholder: string, autoFocus = false) => (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          label={label}
          placeholder={placeholder}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          isInvalid={fieldState.invalid}
          hint={fieldState.error?.message}
          validationBehavior="aria"
          autoFocus={autoFocus}
        />
      )}
    />
  );

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={account ? `Edit ${account.name}` : "New locker"}
      description={account ? undefined : "A bank account that holds one or more pots."}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("name", "Name", "e.g. Everyday", true)}
          {text("bank", "Bank", "e.g. HDFC Bank")}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <Select aria-label="Type" selectedKey={field.value} onSelectionChange={(k) => field.onChange(String(k))}>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} id={t}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            )}
          />
          <Controller
            control={control}
            name="actualBalance"
            render={({ field, fieldState }) => (
              <Input
                label="Actual bank balance"
                placeholder="Optional"
                inputMode="decimal"
                leadingAddon={<span className="text-body-medium text-text-tertiary">₹</span>}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                isInvalid={fieldState.invalid}
                hint={fieldState.error?.message ?? "Compared with the sum of pot balances."}
                validationBehavior="aria"
              />
            )}
          />
        </div>

        <Controller
          control={control}
          name="notes"
          render={({ field, fieldState }) => (
            <Textarea
              label="Notes"
              placeholder="Optional"
              rows={2}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              isInvalid={fieldState.invalid}
              hint={fieldState.error?.message}
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
            {isPending ? "Saving…" : account ? "Save changes" : "Create locker"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
