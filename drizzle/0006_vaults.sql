CREATE TABLE "vault_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vault_id" uuid NOT NULL,
	"month" date NOT NULL,
	"amount_paise" bigint NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vault_adjustments_vault_month" UNIQUE("vault_id","month"),
	CONSTRAINT "vault_adjustments_amount_non_negative" CHECK (amount_paise >= 0),
	CONSTRAINT "vault_adjustments_month_first_day" CHECK (extract(day from month) = 1)
);
--> statement-breakpoint
CREATE TABLE "vault_amounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vault_id" uuid NOT NULL,
	"amount_paise" bigint NOT NULL,
	"effective_from" date NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vault_amounts_vault_effective_from" UNIQUE("vault_id","effective_from"),
	CONSTRAINT "vault_amounts_amount_non_negative" CHECK (amount_paise >= 0),
	CONSTRAINT "vault_amounts_effective_first_day" CHECK (extract(day from effective_from) = 1)
);
--> statement-breakpoint
CREATE TABLE "vaults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'piggy-bank' NOT NULL,
	"color" text DEFAULT 'chart-1' NOT NULL,
	"start_month" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vaults_start_month_first_day" CHECK (extract(day from start_month) = 1)
);
--> statement-breakpoint
ALTER TABLE "vault_adjustments" ADD CONSTRAINT "vault_adjustments_vault_id_vaults_id_fk" FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_amounts" ADD CONSTRAINT "vault_amounts_vault_id_vaults_id_fk" FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id") ON DELETE cascade ON UPDATE no action;