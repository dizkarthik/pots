import { z } from "zod";
import { toPaise } from "@/lib/money";
import { isIsoDate } from "@/lib/month";
import { amountString } from "./pots";

export const expenseFormSchema = z.object({
  date: z.string().refine(isIsoDate, "Pick a date"),
  amount: amountString().refine((v) => (toPaise(v) ?? 0) > 0, "Amount must be more than zero"),
  potId: z.uuid("Choose a pot"),
  paymentMethodId: z.uuid("Choose how you paid"),
  note: z.string().trim().max(200, "Keep the note under 200 characters"),
});
export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const paymentMethodNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name")
  .max(40, "Keep it under 40 characters");
