import { z } from "zod";
import { toPaise } from "@/lib/money";
import { isIsoDate } from "@/lib/month";
import { PAID_VIA_RE } from "@/lib/payment-methods";
import { amountString } from "./pots";

export const expenseFormSchema = z.object({
  date: z.string().refine(isIsoDate, "Pick a date"),
  amount: amountString().refine((v) => (toPaise(v) ?? 0) > 0, "Amount must be more than zero"),
  potId: z.uuid("Choose a pot"),
  /** "m:<paymentMethodId>" or "a:<accountId>" — see lib/payment-methods.ts. */
  paidVia: z.string().regex(PAID_VIA_RE, "Choose how you paid"),
  note: z.string().trim().max(200, "Keep the note under 200 characters"),
});
export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
