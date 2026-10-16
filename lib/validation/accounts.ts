import { z } from "zod";

/** A locker (bank account, card or cash) is identified by its name, stored in `bank`. */
export const accountFormSchema = z.object({
  bank: z.string().trim().min(1, "Give the locker a name").max(60, "Keep it under 60 characters"),
  notes: z.string().trim().max(500, "Keep notes under 500 characters"),
});
export type AccountFormValues = z.infer<typeof accountFormSchema>;
