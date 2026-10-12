CREATE TYPE "public"."account_type" AS ENUM('savings', 'current', 'salary', 'other');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"bank" text NOT NULL,
	"type" "account_type" DEFAULT 'savings' NOT NULL,
	"notes" text,
	"actual_balance_paise" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"amount_paise" bigint NOT NULL,
	"pot_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_positive" CHECK (amount_paise > 0)
);
--> statement-breakpoint
CREATE TABLE "pot_archive_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pot_id" uuid NOT NULL,
	"from_month" date NOT NULL,
	"to_month" date,
	CONSTRAINT "pot_archive_periods_from_first_day" CHECK (extract(day from from_month) = 1),
	CONSTRAINT "pot_archive_periods_to_first_day" CHECK (to_month is null or extract(day from to_month) = 1),
	CONSTRAINT "pot_archive_periods_order" CHECK (to_month is null or to_month >= from_month)
);
--> statement-breakpoint
CREATE TABLE "pot_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pot_id" uuid NOT NULL,
	"amount_paise" bigint NOT NULL,
	"effective_from" date NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pot_budgets_pot_effective_from" UNIQUE("pot_id","effective_from"),
	CONSTRAINT "pot_budgets_amount_non_negative" CHECK (amount_paise >= 0),
	CONSTRAINT "pot_budgets_effective_first_day" CHECK (extract(day from effective_from) = 1)
);
--> statement-breakpoint
CREATE TABLE "pots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'wallet' NOT NULL,
	"color" text DEFAULT 'chart-1' NOT NULL,
	"account_id" uuid NOT NULL,
	"start_month" date NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pots_start_month_first_day" CHECK (extract(day from start_month) = 1)
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_pot_id_pots_id_fk" FOREIGN KEY ("pot_id") REFERENCES "public"."pots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pot_archive_periods" ADD CONSTRAINT "pot_archive_periods_pot_id_pots_id_fk" FOREIGN KEY ("pot_id") REFERENCES "public"."pots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pot_budgets" ADD CONSTRAINT "pot_budgets_pot_id_pots_id_fk" FOREIGN KEY ("pot_id") REFERENCES "public"."pots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pots" ADD CONSTRAINT "pots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_pot_date_idx" ON "expenses" USING btree ("pot_id","date");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "pot_archive_periods_pot_idx" ON "pot_archive_periods" USING btree ("pot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pot_archive_periods_one_open" ON "pot_archive_periods" USING btree ("pot_id") WHERE "pot_archive_periods"."to_month" is null;--> statement-breakpoint
CREATE INDEX "pots_account_idx" ON "pots" USING btree ("account_id");