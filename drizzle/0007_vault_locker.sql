ALTER TABLE "vaults" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vaults_account_idx" ON "vaults" USING btree ("account_id");