import { z } from "zod";
import { toPaise } from "@/lib/money";
import { ACCOUNT_TYPES } from "@/lib/pot-options";

export const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Give the locker a name").max(60, "Keep it under 60 characters"),
  bank: z.string().trim().min(1, "Which bank is it?").max(60, "Keep it under 60 characters"),
  type: z.enum(ACCOUNT_TYPES),
  notes: z.string().trim().max(500, "Keep notes under 500 characters"),
  /** Optional manual bank balance; empty string means "not tracked". */
  actualBalance: z
    .string()
    .trim()
    .refine((v) => v === "" || toPaise(v) !== null, "Enter an amount like 25000 or leave it empty"),
});
export type AccountFormValues = z.infer<typeof accountFormSchema>;
