import { z } from "zod";
import { ACCOUNT_TYPES } from "@/lib/pot-options";

/** A locker is identified by its bank name; there is no separate name. */
export const accountFormSchema = z.object({
  bank: z.string().trim().min(1, "Which bank is it?").max(60, "Keep it under 60 characters"),
  type: z.enum(ACCOUNT_TYPES),
  notes: z.string().trim().max(500, "Keep notes under 500 characters"),
});
export type AccountFormValues = z.infer<typeof accountFormSchema>;
