"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { toPaise } from "@/lib/money";
import { accountFormSchema, type AccountFormValues } from "@/lib/validation/accounts";
import { failed, invalid, type ActionResult } from "./result";

function toRow(values: AccountFormValues) {
  return {
    name: values.name,
    bank: values.bank,
    type: values.type,
    notes: values.notes === "" ? null : values.notes,
    actualBalancePaise: values.actualBalance === "" ? null : toPaise(values.actualBalance)!,
  };
}

export async function createAccount(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = accountFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  await getDb().insert(accounts).values(toRow(parsed.data));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateAccount(accountId: unknown, input: unknown): Promise<ActionResult> {
  await requireSession();
  const id = z.uuid().safeParse(accountId);
  if (!id.success) return failed("Unknown locker.");
  const parsed = accountFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const updated = await getDb()
    .update(accounts)
    .set(toRow(parsed.data))
    .where(eq(accounts.id, id.data))
    .returning({ id: accounts.id });
  if (updated.length === 0) return failed("Unknown locker.");

  revalidatePath("/", "layout");
  return { ok: true };
}
