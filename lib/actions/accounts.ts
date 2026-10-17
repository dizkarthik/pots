"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { accounts, pots, vaults } from "@/lib/db/schema";
import { accountFormSchema, type AccountFormValues } from "@/lib/validation/accounts";
import { failed, invalid, type ActionResult } from "./result";

function toRow(values: AccountFormValues) {
  return {
    bank: values.bank,
    isCredit: values.isCredit,
    notes: values.notes === "" ? null : values.notes,
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

  if (parsed.data.isCredit) {
    // Credit-card lockers can't hold pots.
    const held = await getDb().select({ id: pots.id }).from(pots).where(eq(pots.accountId, id.data)).limit(1);
    if (held.length) return failed("This locker has pots. Move them to another locker before marking it as a credit card.");
    const linked = await getDb().select({ id: vaults.id }).from(vaults).where(eq(vaults.accountId, id.data)).limit(1);
    if (linked.length) return failed("Vaults are linked to this locker. Unlink them before marking it as a credit card.");
  }

  const updated = await getDb()
    .update(accounts)
    .set(toRow(parsed.data))
    .where(eq(accounts.id, id.data))
    .returning({ id: accounts.id });
  if (updated.length === 0) return failed("Unknown locker.");

  revalidatePath("/", "layout");
  return { ok: true };
}
