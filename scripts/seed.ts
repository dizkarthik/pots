/**
 * Seeds realistic sample data relative to the current month (India time):
 * 5 accounts, 11 pots, four months of expenses, including an overspent pot,
 * a past and a pending budget change, a pot created last month, and an
 * archived pot.
 *
 *   npm run db:seed            # refuses if the database already has data
 *   npm run db:seed -- --reset # wipes all app data first
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import { computePotBalance } from "../lib/balance";
import { createDb } from "../lib/db/client";
import { accounts, expenses, potArchivePeriods, potBudgets, pots } from "../lib/db/schema";
import { toLedger } from "../lib/ledger";
import { formatINR } from "../lib/money";
import { addMonths, currentMonth, firstDayOf, lastDayOf, todayIso, type Month } from "../lib/month";

const db = createDb();
const reset = process.argv.includes("--reset");

// Deterministic PRNG (mulberry32) so every run produces the same data.
let state = 20261012;
function random() {
  state = (state + 0x6d2b79f5) | 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min: number, max: number) => Math.round(min + random() * (max - min));
const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
const R = (rupees: number) => Math.round(rupees * 100);

const now = new Date();
const thisMonth = currentMonth(now);
const today = todayIso(now);
const M = (offset: number): Month => addMonths(thisMonth, offset);

/**
 * A day within `month` (random unless `preferred`). Spending is spread over
 * the whole month, so in the current month anything after today is dropped
 * by the caller rather than squeezed into the days so far.
 */
function dayIn(month: Month, preferred?: number): string {
  const day = preferred ?? between(1, Number(lastDayOf(month).slice(8)));
  return `${month}-${String(day).padStart(2, "0")}`;
}

type PotSeed = {
  key: string;
  name: string;
  icon: string;
  color: string;
  account: string;
  start: Month;
  budgets: [Month, number][];
  archivedFrom?: Month;
  /** Expenses for one month: [date, rupees, note?][] */
  spend: (month: Month) => [string, number, string?][];
};

const ACCOUNTS = [
  { key: "hdfc", bank: "HDFC Bank", notes: "Salary credit on the 1st" },
  { key: "icici", bank: "ICICI Bank", notes: "Utilities and subscriptions" },
  { key: "sbi", bank: "SBI", notes: null },
  { key: "axis", bank: "Axis Bank", notes: null },
  { key: "kotak", bank: "Kotak 811", notes: "Sinking funds" },
] as const;

const GROCERY = ["BigBasket", "DMart", "Zepto", "Local kirana", "Blinkit", "Nature's Basket"];
const DINING = ["Swiggy", "Zomato", "Third Wave Coffee", "Dinner with friends", "Meghana Foods", "Office lunch"];
const SHOPPING = ["Myntra", "Amazon", "Decathlon", "Uniqlo", "IKEA"];

const POTS: PotSeed[] = [
  {
    key: "rent", name: "Rent", icon: "house", color: "chart-6", account: "hdfc", start: M(-3),
    budgets: [[M(-3), 25000]],
    spend: (m) => [[dayIn(m, 1), 25000, "Monthly rent"]],
  },
  {
    key: "groceries", name: "Groceries", icon: "shopping-cart", color: "chart-2", account: "hdfc", start: M(-3),
    budgets: [[M(-3), 12000]],
    spend: (m) => Array.from({ length: between(6, 9) }, () => [dayIn(m), between(700, 1900), pick(GROCERY)]),
  },
  {
    key: "electricity", name: "Electricity", icon: "zap", color: "chart-8", account: "icici", start: M(-3),
    budgets: [[M(-3), 2500]],
    spend: (m) => [[dayIn(m, 8), between(1800, 2900), "BESCOM bill"]],
  },
  {
    key: "internet", name: "Mobile & Internet", icon: "wifi", color: "chart-4", account: "icici", start: M(-3),
    budgets: [[M(-3), 1500]],
    spend: (m) => [[dayIn(m, 5), 699, "Airtel postpaid"], [dayIn(m, 11), 799, "ACT Fibernet"]],
  },
  {
    // Past change (₹3,500 → ₹4,000 last month) and a pending one for next month.
    key: "petrol", name: "Petrol", icon: "fuel", color: "chart-3", account: "sbi", start: M(-3),
    budgets: [[M(-3), 3500], [M(-1), 4000], [M(1), 4500]],
    spend: (m) => Array.from({ length: between(2, 3) }, () => [dayIn(m), between(900, 1400), "Indian Oil"]),
  },
  {
    // Consistently overspent — the negative balance carries forward.
    key: "dining", name: "Dining out", icon: "utensils", color: "chart-5", account: "sbi", start: M(-3),
    budgets: [[M(-3), 5000]],
    spend: (m) => Array.from({ length: between(6, 8) }, () => [dayIn(m), between(650, 1300), pick(DINING)]),
  },
  {
    key: "gym", name: "Gym", icon: "dumbbell", color: "chart-7", account: "axis", start: M(-3),
    budgets: [[M(-3), 2000]],
    spend: (m) => [[dayIn(m, 3), 2000, "Cult.fit membership"]],
  },
  {
    key: "shopping", name: "Shopping", icon: "shopping-bag", color: "chart-9", account: "axis", start: M(-3),
    budgets: [[M(-3), 6000]],
    spend: (m) => Array.from({ length: between(1, 3) }, () => [dayIn(m), between(900, 3800), pick(SHOPPING)]),
  },
  {
    key: "medical", name: "Medical", icon: "pill", color: "chart-1", account: "kotak", start: M(-3),
    budgets: [[M(-3), 3000]],
    spend: (m) => (random() < 0.6 ? [[dayIn(m), between(250, 1800), pick(["Apollo Pharmacy", "Doctor visit", "Lab tests"])]] : []),
  },
  {
    // Created last month (mid-year): accrues only from its start month.
    key: "travel", name: "Travel", icon: "plane", color: "chart-4", account: "kotak", start: M(-1),
    budgets: [[M(-1), 10000]],
    spend: (m) => (m === thisMonth ? [[dayIn(m, 6), 7800, "Weekend trip to Coorg"]] : []),
  },
  {
    // Archived two months ago: balance frozen since then.
    key: "subscriptions", name: "Subscriptions", icon: "tv", color: "chart-5", account: "icici", start: M(-3),
    budgets: [[M(-3), 1200]],
    archivedFrom: M(-2),
    spend: (m) => (m <= M(-2) ? [[dayIn(m, 15), 649, "Netflix"], [dayIn(m, 15), 119, "Spotify"]] : []),
  },
];

async function main() {
  const existing = await db.select({ id: accounts.id }).from(accounts).limit(1);
  if (existing.length && !reset) {
    console.error("Database already has data. Re-run with `npm run db:seed -- --reset` to wipe and reseed.");
    process.exit(1);
  }
  if (reset) {
    await db.delete(expenses);
    await db.delete(potBudgets);
    await db.delete(potArchivePeriods);
    await db.delete(pots);
    await db.delete(accounts);
    console.log("Wiped existing data.");
  }

  const accountIds = new Map<string, string>();
  for (const a of ACCOUNTS) {
    const [row] = await db
      .insert(accounts)
      .values({ bank: a.bank, notes: a.notes })
      .returning({ id: accounts.id });
    accountIds.set(a.key, row.id);
  }

  const months = [M(-3), M(-2), M(-1), thisMonth];
  const summary: { name: string; account: string; budget: string; spent: string; carried: string; balance: string }[] = [];

  for (const p of POTS) {
    const [pot] = await db
      .insert(pots)
      .values({
        name: p.name,
        icon: p.icon,
        color: p.color,
        accountId: accountIds.get(p.account)!,
        startMonth: firstDayOf(p.start),
        isArchived: Boolean(p.archivedFrom),
      })
      .returning({ id: pots.id });

    const budgetRows = p.budgets.map(([m, rupees]) => ({ potId: pot.id, effectiveFrom: firstDayOf(m), amountPaise: R(rupees) }));
    await db.insert(potBudgets).values(budgetRows);

    const periodRows = p.archivedFrom ? [{ potId: pot.id, fromMonth: firstDayOf(p.archivedFrom), toMonth: null }] : [];
    if (periodRows.length) await db.insert(potArchivePeriods).values(periodRows);

    const expenseRows = months
      .filter((m) => m >= p.start)
      .flatMap((m) => p.spend(m))
      .filter(([date]) => date <= today)
      .map(([date, rupees, note]) => ({
        potId: pot.id,
        date,
        amountPaise: R(rupees),
        note: note ?? null,
        // Seed lockers have no sub payment methods, so expenses are paid directly.
        accountId: accountIds.get(p.account)!,
      }));
    if (expenseRows.length) await db.insert(expenses).values(expenseRows);

    const b = computePotBalance(toLedger({ startMonth: firstDayOf(p.start) }, budgetRows, periodRows, expenseRows), thisMonth);
    summary.push({
      name: p.name + (p.archivedFrom ? " (archived)" : ""),
      account: ACCOUNTS.find((a) => a.key === p.account)!.bank,
      budget: formatINR(b.budgetThisMonth, { whole: true }),
      spent: formatINR(b.spentThisMonth, { whole: true }),
      carried: formatINR(b.carriedOver, { whole: true }),
      balance: formatINR(b.balance, { whole: true }),
    });
  }

  const [counts] = await Promise.all([
    Promise.all([accounts, pots, potBudgets, potArchivePeriods, expenses].map((t) => db.$count(t))),
  ]);
  console.log(`Seeded ${counts[0]} accounts, ${counts[1]} pots, ${counts[2]} budget rows, ${counts[3]} archive periods, ${counts[4]} expenses.`);
  console.log(`Balances for ${thisMonth} (today ${today}):`);
  console.table(summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
