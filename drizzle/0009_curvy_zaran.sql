CREATE TABLE "month_allocations" (
	"month" date PRIMARY KEY NOT NULL,
	"allocated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "month_allocations_month_first_day" CHECK (extract(day from month) = 1)
);
--> statement-breakpoint
CREATE TABLE "pot_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pot_id" uuid NOT NULL,
	"month" date NOT NULL,
	"amount_paise" bigint NOT NULL,
	CONSTRAINT "pot_allocations_pot_month" UNIQUE("pot_id","month"),
	CONSTRAINT "pot_allocations_amount_non_negative" CHECK (amount_paise >= 0),
	CONSTRAINT "pot_allocations_month_first_day" CHECK (extract(day from month) = 1)
);
--> statement-breakpoint
ALTER TABLE "pot_allocations" ADD CONSTRAINT "pot_allocations_pot_id_pots_id_fk" FOREIGN KEY ("pot_id") REFERENCES "public"."pots"("id") ON DELETE cascade ON UPDATE no action;