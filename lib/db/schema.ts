import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Money columns are integer paise (bigint, read as JS number — safe up to
// ~₹90 trillion). Month columns are `date`s pinned to the first of the month.
// Pot balances are computed in lib/balance.ts and never stored.

const paise = (name: string) => bigint(name, { mode: "number" });
const day = (name: string) => date(name, { mode: "string" });
const firstOfMonth = (column: string) => sql.raw(`extract(day from ${column}) = 1`);

export const accountType = pgEnum("account_type", ["savings", "current", "salary", "other"]);

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  bank: text("bank").notNull(),
  type: accountType("type").notNull().default("savings"),
  notes: text("notes"),
  /** Manually entered bank balance, for comparison with the sum of pot balances. */
  actualBalancePaise: paise("actual_balance_paise"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pots = pgTable(
  "pots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Lucide icon name, e.g. "fuel". */
    icon: text("icon").notNull().default("wallet"),
    /** BoardUI chart token, e.g. "chart-3". */
    color: text("color").notNull().default("chart-1"),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    startMonth: day("start_month").notNull(),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pots_account_idx").on(t.accountId),
    check("pots_start_month_first_day", firstOfMonth("start_month")),
  ],
);

/**
 * Months between from_month (exclusive) and to_month (exclusive) accrue no
 * budget. to_month is null while the pot is archived. See lib/balance.ts.
 */
export const potArchivePeriods = pgTable(
  "pot_archive_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    potId: uuid("pot_id")
      .notNull()
      .references(() => pots.id, { onDelete: "cascade" }),
    fromMonth: day("from_month").notNull(),
    toMonth: day("to_month"),
  },
  (t) => [
    index("pot_archive_periods_pot_idx").on(t.potId),
    // At most one open (current) archive period per pot.
    uniqueIndex("pot_archive_periods_one_open").on(t.potId).where(sql`${t.toMonth} is null`),
    check("pot_archive_periods_from_first_day", firstOfMonth("from_month")),
    check("pot_archive_periods_to_first_day", sql.raw("to_month is null or extract(day from to_month) = 1")),
    check("pot_archive_periods_order", sql.raw("to_month is null or to_month >= from_month")),
  ],
);

/**
 * Budget history. An edit upserts (pot_id, effective_from = first of next
 * month), so repeat edits within a month overwrite the pending row.
 */
export const potBudgets = pgTable(
  "pot_budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    potId: uuid("pot_id")
      .notNull()
      .references(() => pots.id, { onDelete: "cascade" }),
    amountPaise: paise("amount_paise").notNull(),
    effectiveFrom: day("effective_from").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("pot_budgets_pot_effective_from").on(t.potId, t.effectiveFrom),
    check("pot_budgets_amount_non_negative", sql.raw("amount_paise >= 0")),
    check("pot_budgets_effective_first_day", firstOfMonth("effective_from")),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: day("date").notNull(),
    amountPaise: paise("amount_paise").notNull(),
    potId: uuid("pot_id")
      .notNull()
      .references(() => pots.id, { onDelete: "restrict" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("expenses_pot_date_idx").on(t.potId, t.date),
    index("expenses_date_idx").on(t.date),
    check("expenses_amount_positive", sql.raw("amount_paise > 0")),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type Pot = typeof pots.$inferSelect;
export type PotBudget = typeof potBudgets.$inferSelect;
export type PotArchivePeriod = typeof potArchivePeriods.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
