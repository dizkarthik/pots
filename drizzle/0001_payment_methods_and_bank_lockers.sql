CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_name_ci" ON "payment_methods" USING btree (lower("name"));--> statement-breakpoint
-- Preset payment methods (keep in sync with PRESET_PAYMENT_METHODS in lib/payment-methods.ts).
INSERT INTO "payment_methods" ("name") VALUES ('Cash'), ('UPI'), ('HDFC Credit'), ('RuPay Credit'), ('Debit Card')
	ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Hand-edited: add nullable, backfill existing expenses with Cash, then enforce NOT NULL.
ALTER TABLE "expenses" ADD COLUMN "payment_method_id" uuid;--> statement-breakpoint
UPDATE "expenses" SET "payment_method_id" = (SELECT "id" FROM "payment_methods" WHERE lower("name") = 'cash');--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "payment_method_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "name";
