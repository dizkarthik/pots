"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { accounts, expenses, paymentMethods, pots } from "@/lib/db/schema";
import { toPaise } from "@/lib/money";
import { compareMonths, formatMonth, monthOf, todayIso } from "@/lib/month";
import { parsePaidVia } from "@/lib/payment-methods";
import { expenseFormSchema, type ExpenseFormValues } from "@/lib/validation/expenses";
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

type PaidVia = { accountId: string; paymentMethodId: string | null };

/**
 * Resolves the "Paid via" choice to a locker (+ sub method). Enforces the rule
 * that a locker with sub methods can only be paid through one of them.
 */
async function resolvePaidVia(value: string): Promise<PaidVia | ActionResult> {
  const invalidChoice: ActionResult = {
    ok: false,
    error: "Please fix the highlighted fields.",
    fieldErrors: { paidVia: "Choose how you paid" },
  };
  const parsed = parsePaidVia(value);
  if (!parsed) return invalidChoice;
  const db = getDb();

  if (parsed.kind === "method") {
    const [method] = await db
      .select({ id: paymentMethods.id, accountId: paymentMethods.accountId })
      .from(paymentMethods)
      .where(eq(paymentMethods.id, parsed.id));
    return method ? { accountId: method.accountId, paymentMethodId: method.id } : invalidChoice;
  }

  const [account] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, parsed.id));
  if (!account) return invalidChoice;
  const subs = await db.select({ id: paymentMethods.id }).from(paymentMethods).where(eq(paymentMethods.accountId, account.id)).limit(1);
  if (subs.length) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { paidVia: "Pick this locker's card or UPI" } };
  }
  return { accountId: account.id, paymentMethodId: null };
}

function toRow(values: ExpenseFormValues, paidVia: PaidVia) {
  return {
    date: values.date,
    amountPaise: toPaise(values.amount)!,
    potId: values.potId,
    accountId: paidVia.accountId,
    paymentMethodId: paidVia.paymentMethodId,
    note: values.note === "" ? null : values.note,
  };
}

export async function createExpense(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = expenseFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const problem = await check(parsed.data);
  if (problem) return problem;
  const paidVia = await resolvePaidVia(parsed.data.paidVia);
  if ("ok" in paidVia) return paidVia;

  await getDb().insert(expenses).values(toRow(parsed.data, paidVia));
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
  const paidVia = await resolvePaidVia(parsed.data.paidVia);
  if ("ok" in paidVia) return paidVia;

  await db.update(expenses).set(toRow(parsed.data, paidVia)).where(eq(expenses.id, id.data));
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
