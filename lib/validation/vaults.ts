import { z } from "zod";
import { isMonth } from "@/lib/month";
import { POT_COLORS, POT_ICON_NAMES } from "@/lib/pot-options";
import { amountString } from "./pots";

/** No start month or effective date: the server decides both. */
export const vaultFormSchema = z.object({
  name: z.string().trim().min(1, "Give the vault a name").max(60, "Keep it under 60 characters"),
  icon: z.enum(POT_ICON_NAMES),
  color: z.enum(POT_COLORS),
  monthly: amountString(),
});
export type VaultFormValues = z.infer<typeof vaultFormSchema>;

/** Editing an existing vault's details; its monthly amount changes via a step up/down. */
export const vaultDetailsSchema = vaultFormSchema.omit({ monthly: true });
export type VaultDetailsValues = z.infer<typeof vaultDetailsSchema>;

/** Step up / down: the new monthly amount, from `from` onward (next month or any past month). */
export const vaultStepSchema = z.object({
  from: z.string().refine((v): boolean => isMonth(v), "Pick a month"),
  amount: amountString(),
});
export type VaultStepValues = z.infer<typeof vaultStepSchema>;

/** A one-off amount for one month; "0" means the month was skipped. */
export const vaultAdjustmentSchema = z.object({
  month: z.string().refine((v): boolean => isMonth(v), "Pick a month"),
  amount: amountString(),
  note: z.string().trim().max(200, "Keep the note under 200 characters"),
});
export type VaultAdjustmentValues = z.infer<typeof vaultAdjustmentSchema>;
