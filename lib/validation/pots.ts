import { z } from "zod";
import { toPaise } from "@/lib/money";
import { POT_COLORS, POT_ICON_NAMES } from "@/lib/pot-options";

// Amount fields stay strings in forms; the server converts with toPaise().
export const amountString = (message = "Enter an amount like 500 or 499.50") =>
  z.string().trim().refine((v) => toPaise(v) !== null, message);

/**
 * Note: no start month or effective date here. The server decides both
 * (start = current month on create; budget edits apply from next month).
 */
export const potFormSchema = z.object({
  name: z.string().trim().min(1, "Give the pot a name").max(60, "Keep it under 60 characters"),
  icon: z.enum(POT_ICON_NAMES),
  color: z.enum(POT_COLORS),
  accountId: z.uuid("Choose a locker"),
  budget: amountString(),
});
export type PotFormValues = z.infer<typeof potFormSchema>;

export const potIdSchema = z.uuid();
