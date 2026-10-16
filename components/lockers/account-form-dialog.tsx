"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { Textarea } from "@/components/base/textarea/textarea";
import { Dialog } from "@/components/shared/dialog";
import { createAccount, updateAccount } from "@/lib/actions/accounts";
import type { Account } from "@/lib/db/schema";
import { accountFormSchema, type AccountFormValues } from "@/lib/validation/accounts";

function defaults(account: Account | null): AccountFormValues {
  return {
    bank: account?.bank ?? "",
    isCredit: account?.isCredit ?? false,
    notes: account?.notes ?? "",
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

  const text = (name: "bank", label: string, placeholder: string, autoFocus = false) => (
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
      title={account ? `Edit ${account.bank}` : "New locker"}
      description={account ? undefined : "A bank account, card or cash that holds one or more pots."}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {text("bank", "Name", "e.g. HDFC, Millennia, Cash", true)}

        <Controller
          control={control}
          name="isCredit"
          render={({ field }) => (
            <Checkbox isSelected={field.value} onChange={field.onChange}>
              Credit card <span className="text-text-tertiary">— tagged CREDIT and listed last</span>
            </Checkbox>
          )}
        />

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
