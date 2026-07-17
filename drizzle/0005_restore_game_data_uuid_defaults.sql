ALTER TABLE "echo_sets" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE "echo_main_stats" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
