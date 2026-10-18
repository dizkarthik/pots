import { z } from "zod";
import { isMonth } from "@/lib/month";
import { amountString } from "./pots";

/** Allocation form: a whole-rupee amount per pot id, for one month. */
export const allocationSchema = z.object({
  month: z.string().refine((v): boolean => isMonth(v), "Unknown month"),
  amounts: z.record(z.uuid(), amountString()),
});
export type AllocationValues = z.infer<typeof allocationSchema>;
