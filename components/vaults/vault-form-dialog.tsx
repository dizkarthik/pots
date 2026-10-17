"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { Select, SelectItem } from "@/components/base/select/select";
import { Dialog } from "@/components/shared/dialog";
import {
  ColorPicker,
  IconPicker,
} from "@/components/shared/icon-color-pickers";
import { createVault, updateVaultDetails } from "@/lib/actions/vaults";
import { formatMonth, type Month } from "@/lib/month";
import {
  POT_COLORS,
  POT_ICON_NAMES,
  type PotColor,
  type PotIconName,
} from "@/lib/pot-options";
import type { VaultRow } from "@/lib/queries/vaults";
import { vaultFormSchema, type VaultFormValues } from "@/lib/validation/vaults";
import { cx } from "@/utils/cx";

const NOT_LINKED = "none";

function defaults(vault: VaultRow | null): VaultFormValues {
  if (!vault)
    return {
      name: "",
      icon: "piggy-bank",
      color: "chart-7",
      accountId: "",
      monthly: "",
    };
  return {
    name: vault.name,
    icon: (POT_ICON_NAMES as string[]).includes(vault.icon)
      ? (vault.icon as PotIconName)
      : "piggy-bank",
    color: (POT_COLORS as readonly string[]).includes(vault.color)
      ? (vault.color as PotColor)
      : "chart-7",
    accountId: vault.accountId ?? "",
    // Not edited here: the monthly amount changes via Step up / down.
    monthly: "0",
  };
}

export function VaultFormDialog({
  isOpen,
  onOpenChange,
  vault,
  month,
  lockers,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create a new vault. */
  vault: VaultRow | null;
  month: Month;
  /** Bank lockers a vault can be saved in (credit cards excluded). */
  lockers: { id: string; bank: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const { control, handleSubmit, reset, setError, formState } =
    useForm<VaultFormValues>({
      resolver: zodResolver(vaultFormSchema),
      defaultValues: defaults(vault),
    });

  useEffect(() => {
    if (isOpen) reset(defaults(vault));
  }, [isOpen, vault, reset]);

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = vault
        ? await updateVaultDetails(vault.id, {
            name: values.name,
            icon: values.icon,
            color: values.color,
            accountId: values.accountId,
          })
        : await createVault(values);
      if (result.ok) {
        onOpenChange(false);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof VaultFormValues, { message });
      }
      setError("root", { message: result.error });
    }),
  );

  const hint = `Added automatically every month, starting ${formatMonth(month)}. Change it later with Step up / down.`;

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={vault ? `Edit ${vault.name} details` : "New vault"}
      description={
        vault ? undefined : "An investment that grows by a monthly amount."
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              label="Name"
              placeholder="e.g. Gold"
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
          name="accountId"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label>Locker</Label>
              <Select
                aria-label="Locker"
                selectedKey={field.value === "" ? NOT_LINKED : field.value}
                onSelectionChange={(k) =>
                  field.onChange(k === NOT_LINKED ? "" : String(k))
                }
              >
                {[{ id: NOT_LINKED, bank: "Not linked" }, ...lockers].map(
                  (l) => (
                    <SelectItem key={l.id} id={l.id}>
                      {l.bank}
                    </SelectItem>
                  ),
                )}
              </Select>
              <p className="text-caption-1-regular text-text-secondary">
                {fieldState.error?.message ??
                  "Optional. If the money is saved in a bank account, its invested total counts toward that locker's balance."}
              </p>
            </div>
          )}
        />
        {!vault && (
          <>
            <Controller
              control={control}
              name="monthly"
              render={({ field, fieldState }) => (
                <Input
                  label="Monthly investment"
                  placeholder="0"
                  inputMode="numeric"
                  leadingAddon={
                    <span className="text-body-medium text-text-tertiary">
                      ₹
                    </span>
                  }
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  isInvalid={fieldState.invalid}
                  validationBehavior="aria"
                />
              )}
            />
            <p
              className={cx(
                "-mt-2 text-caption-1-regular",
                formState.errors.monthly
                  ? "text-text-error-primary"
                  : "text-text-secondary",
              )}
            >
              {formState.errors.monthly?.message ?? hint}
            </p>
          </>
        )}

        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <IconPicker value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <ColorPicker value={field.value} onChange={field.onChange} />
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
            {isPending ? "Saving…" : vault ? "Save changes" : "Create vault"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
