import { z } from "zod";
import { toPaise } from "@/lib/money";
import { isIsoDate } from "@/lib/month";
import { amountString } from "./pots";

export const expenseFormSchema = z.object({
  date: z.string().refine(isIsoDate, "Pick a date"),
  amount: amountString().refine((v) => (toPaise(v) ?? 0) > 0, "Amount must be more than zero"),
  potId: z.uuid("Choose a pot"),
  note: z.string().trim().max(200, "Keep the note under 200 characters"),
});
export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
