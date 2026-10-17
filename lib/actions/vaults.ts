"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { accounts, vaultAdjustments, vaultAmounts, vaults } from "@/lib/db/schema";
import { toPaise } from "@/lib/money";
import { addMonths, compareMonths, currentMonth, firstDayOf, formatMonth, monthOf, type Month } from "@/lib/month";
import { vaultAdjustmentSchema, vaultDetailsSchema, vaultFormSchema, vaultStepSchema } from "@/lib/validation/vaults";
import { parseParked } from "@/lib/vaults";
import { failed, invalid, type ActionResult } from "./result";

const idSchema = z.uuid();

/**
 * Resolves "Parked" to the columns to store. A locker must exist and be a bank
 * locker (not a credit card); an instrument must be one of VAULT_INSTRUMENTS.
 */
async function resolveParked(value: string): Promise<{ accountId: string | null; parkedIn: string | null } | ActionResult> {
  const parked = parseParked(value);
  const bad: ActionResult = { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { parked: "Choose where it's parked" } };
  if (parked === undefined) return bad;
  if (parked === null) return { accountId: null, parkedIn: null };
  if (parked.kind === "instrument") return { accountId: null, parkedIn: parked.instrument };
  const [row] = await getDb().select({ isCredit: accounts.isCredit }).from(accounts).where(eq(accounts.id, parked.accountId));
  if (!row) return failed("That locker no longer exists.");
  if (row.isCredit) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { parked: "Credit card lockers can't hold vaults" } };
  }
  return { accountId: parked.accountId, parkedIn: null };
}

export async function createVault(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = vaultFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { name, icon, color, monthly } = parsed.data;
  const parked = await resolveParked(parsed.data.parked);
  if ("ok" in parked) return parked;

  // Starts this month; its first monthly amount applies to this month.
  const db = getDb();
  const id = crypto.randomUUID();
  const startMonth = firstDayOf(currentMonth());
  await db.batch([
    db.insert(vaults).values({ id, name, icon, color, ...parked, startMonth }),
    db.insert(vaultAmounts).values({ vaultId: id, amountPaise: toPaise(monthly)!, effectiveFrom: startMonth }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateVaultDetails(vaultId: unknown, input: unknown): Promise<ActionResult> {
  await requireSession();
  const id = idSchema.safeParse(vaultId);
  if (!id.success) return failed("Unknown vault.");
  const parsed = vaultDetailsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const parked = await resolveParked(parsed.data.parked);
  if ("ok" in parked) return parked;
  const { name, icon, color } = parsed.data;
  const updated = await getDb()
    .update(vaults)
    .set({ name, icon, color, ...parked })
    .where(eq(vaults.id, id.data))
    .returning({ id: vaults.id });
  if (updated.length === 0) return failed("Unknown vault.");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Step up / down: the monthly amount becomes `amount` from `from` onward (until
 * a later step). `from` may be next month or any month back to the vault's
 * start, so a step-up that already happened can be recorded. One-off month
 * edits (adjustments) still take precedence for their own month.
 */
export async function stepVaultAmount(vaultId: unknown, input: unknown): Promise<ActionResult> {
  await requireSession();
  const id = idSchema.safeParse(vaultId);
  if (!id.success) return failed("Unknown vault.");
  const parsed = vaultStepSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const from = parsed.data.from as Month;

  const db = getDb();
  const [vault] = await db.select({ startMonth: vaults.startMonth }).from(vaults).where(eq(vaults.id, id.data));
  if (!vault) return failed("Unknown vault.");
  const start = monthOf(vault.startMonth);
  const latest = addMonths(currentMonth(), 1);
  if (compareMonths(from, start) < 0 || compareMonths(from, latest) > 0) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: { from: `Pick a month from ${formatMonth(start)} to ${formatMonth(latest)}` },
    };
  }

  const amountPaise = toPaise(parsed.data.amount)!;
  await db
    .insert(vaultAmounts)
    .values({ vaultId: id.data, amountPaise, effectiveFrom: firstDayOf(from) })
    .onConflictDoUpdate({
      target: [vaultAmounts.vaultId, vaultAmounts.effectiveFrom],
      set: { amountPaise, updatedAt: sql`now()` },
    });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Months that can be adjusted: from the vault's start month through the current month. */
async function checkAdjustableMonth(vaultId: string, month: Month): Promise<ActionResult | null> {
  const [vault] = await getDb().select({ startMonth: vaults.startMonth }).from(vaults).where(eq(vaults.id, vaultId));
  if (!vault) return failed("Unknown vault.");
  const start = monthOf(vault.startMonth);
  if (compareMonths(month, start) < 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { month: `This vault starts in ${formatMonth(start)}` } };
  }
  if (compareMonths(month, currentMonth()) > 0) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { month: "Future months can't be adjusted yet" } };
  }
  return null;
}

/** Sets a one-off amount for a month (₹0 = skipped), replacing any earlier adjustment. */
export async function setVaultAdjustment(vaultId: unknown, input: unknown): Promise<ActionResult> {
  await requireSession();
  const id = idSchema.safeParse(vaultId);
  if (!id.success) return failed("Unknown vault.");
  const parsed = vaultAdjustmentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const month = parsed.data.month as Month;
  const problem = await checkAdjustableMonth(id.data, month);
  if (problem) return problem;

  const amountPaise = toPaise(parsed.data.amount)!;
  const note = parsed.data.note === "" ? null : parsed.data.note;
  await getDb()
    .insert(vaultAdjustments)
    .values({ vaultId: id.data, month: firstDayOf(month), amountPaise, note })
    .onConflictDoUpdate({
      target: [vaultAdjustments.vaultId, vaultAdjustments.month],
      set: { amountPaise, note, updatedAt: sql`now()` },
    });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Removes a month's adjustment so the automatic monthly amount applies again. */
export async function clearVaultAdjustment(vaultId: unknown, month: unknown): Promise<ActionResult> {
  await requireSession();
  const id = idSchema.safeParse(vaultId);
  const m = vaultAdjustmentSchema.shape.month.safeParse(month);
  if (!id.success || !m.success) return failed("Unknown adjustment.");
  await getDb()
    .delete(vaultAdjustments)
    .where(and(eq(vaultAdjustments.vaultId, id.data), eq(vaultAdjustments.month, firstDayOf(m.data as Month))));
  revalidatePath("/", "layout");
  return { ok: true };
}
