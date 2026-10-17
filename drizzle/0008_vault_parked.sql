ALTER TABLE "vaults" ADD COLUMN "parked_in" text;--> statement-breakpoint
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_parked_one_place" CHECK (account_id is null or parked_in is null);