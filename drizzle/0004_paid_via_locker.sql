ALTER TABLE "expenses" ALTER COLUMN "payment_method_id" DROP NOT NULL;--> statement-breakpoint
-- Hand-edited: remove the generic presets (Cash, UPI, Debit Card, HDFC Credit, RuPay Credit).
-- They have no locker and no expense uses them; "Paid via" now comes from lockers.
DELETE FROM "payment_methods" WHERE "account_id" IS NULL;--> statement-breakpoint
ALTER TABLE "payment_methods" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "account_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_account_idx" ON "expenses" USING btree ("account_id");