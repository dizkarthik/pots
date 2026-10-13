"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { expenses, paymentMethods, pots } from "@/lib/db/schema";
import { toPaise } from "@/lib/money";
import { compareMonths, formatMonth, monthOf, todayIso } from "@/lib/month";
import { normalizePaymentMethodName } from "@/lib/payment-methods";
import { expenseFormSchema, paymentMethodNameSchema, type ExpenseFormValues } from "@/lib/validation/expenses";
import { failed, invalid, type ActionResult } from "./result";

const idSchema = z.uuid();

/**
 * Server-side business checks shared by create and update. `previousPotId`
 * lets an existing expense stay on a pot that has since been archived.
 */
async function check(values: ExpenseFormValues, previousPotId?: string): Promise<ActionResult | null> {
  if (values.date > todayIso()) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { date: "Expenses can't be in the future" } };
  }
  const [pot] = await getDb()
    .select({ startMonth: pots.startMonth, isArchived: pots.isArchived })
    .from(pots)
    .where(eq(pots.id, values.potId));
  if (!pot) return failed("That pot no longer exists.");
  if (pot.isArchived && values.potId !== previousPotId) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { potId: "This pot is archived" } };
  }
  const [method] = await getDb()
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(eq(paymentMethods.id, values.paymentMethodId));
  if (!method) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { paymentMethodId: "Choose how you paid" } };
  }
  const start = monthOf(pot.startMonth);
  if (compareMonths(monthOf(values.date), start) < 0) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: { date: `This pot starts in ${formatMonth(start)}` },
    };
  }
  return null;
}

function toRow(values: ExpenseFormValues) {
  return {
    date: values.date,
    amountPaise: toPaise(values.amount)!,
    potId: values.potId,
    paymentMethodId: values.paymentMethodId,
    note: values.note === "" ? null : values.note,
  };
}

export async function createExpense(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = expenseFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const problem = await check(parsed.data);
  if (problem) return problem;

  await getDb().insert(expenses).values(toRow(parsed.data));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateExpense(expenseId: unknown, input: unknown): Promise<ActionResult> {
  await requireSession();
  const id = idSchema.safeParse(expenseId);
  if (!id.success) return failed("Unknown expense.");
  const parsed = expenseFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const db = getDb();
  const [existing] = await db.select({ potId: expenses.potId }).from(expenses).where(eq(expenses.id, id.data));
  if (!existing) return failed("That expense no longer exists.");
  const problem = await check(parsed.data, existing.potId);
  if (problem) return problem;

  await db.update(expenses).set(toRow(parsed.data)).where(eq(expenses.id, id.data));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteExpense(expenseId: unknown): Promise<ActionResult> {
  await requireSession();
  const id = idSchema.safeParse(expenseId);
  if (!id.success) return failed("Unknown expense.");

  // Hard delete; balances are computed, so every month corrects itself.
  await getDb().delete(expenses).where(eq(expenses.id, id.data));
  revalidatePath("/", "layout");
  return { ok: true };
}

export type CreatePaymentMethodResult = { ok: true; id: string; name: string } | { ok: false; error: string };

/**
 * Adds a payment method from the expense form ("Create “Jupiter Card”").
 * Names are unique case-insensitively, so an existing match is returned
 * instead of creating a near-duplicate.
 */
export async function createPaymentMethod(input: unknown): Promise<CreatePaymentMethodResult> {
  await requireSession();
  const parsed = paymentMethodNameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid name" };
  const name = normalizePaymentMethodName(parsed.data);

  const db = getDb();
  const [inserted] = await db
    .insert(paymentMethods)
    .values({ name })
    .onConflictDoNothing()
    .returning({ id: paymentMethods.id, name: paymentMethods.name });
  if (inserted) {
    revalidatePath("/expenses");
    return { ok: true, ...inserted };
  }

  const [existing] = await db
    .select({ id: paymentMethods.id, name: paymentMethods.name })
    .from(paymentMethods)
    .where(eq(sql`lower(${paymentMethods.name})`, name.toLowerCase()));
  return existing ? { ok: true, ...existing } : { ok: false, error: "Couldn't save that payment method." };
}
