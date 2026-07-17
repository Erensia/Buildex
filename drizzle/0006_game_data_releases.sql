CREATE TABLE "game_data_releases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "game_id" uuid NOT NULL,
  "version" varchar(32) NOT NULL,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "source_snapshot" varchar(10) NOT NULL,
  "source_manifest" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "published_at" timestamp with time zone,
  CONSTRAINT "game_data_release_game_version_idx" UNIQUE("game_id","version")
);
--> statement-breakpoint
ALTER TABLE "game_data_releases" ADD CONSTRAINT "game_data_releases_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "current_data_release_id" uuid;
--> statement-breakpoint
INSERT INTO "game_data_releases" ("id", "game_id", "version", "status", "source_snapshot", "source_manifest", "notes", "published_at")
SELECT '70000000-0000-4000-8000-000000000001', "id", COALESCE("current_data_version", '3.5'), 'published', COALESCE("source_snapshot", '2026-07-16'),
  jsonb_build_array(jsonb_build_object('url', COALESCE("source_url", ''), 'label', 'Initial verified seed')), 'Initial imported release', now()
FROM "games" WHERE "slug" = 'wuthering-waves';
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "release_id" uuid;
ALTER TABLE "weapons" ADD COLUMN "release_id" uuid;
ALTER TABLE "echoes" ADD COLUMN "release_id" uuid;
ALTER TABLE "echo_sets" ADD COLUMN "release_id" uuid;
ALTER TABLE "echo_main_stats" ADD COLUMN "release_id" uuid;
ALTER TABLE "build_profiles" ADD COLUMN "data_release_id" uuid;
--> statement-breakpoint
UPDATE "characters" SET "release_id" = '70000000-0000-4000-8000-000000000001' WHERE "game_id" = '10000000-0000-4000-8000-000000000001';
UPDATE "weapons" SET "release_id" = '70000000-0000-4000-8000-000000000001' WHERE "game_id" = '10000000-0000-4000-8000-000000000001';
UPDATE "echoes" SET "release_id" = '70000000-0000-4000-8000-000000000001' WHERE "game_id" = '10000000-0000-4000-8000-000000000001';
UPDATE "echo_sets" SET "release_id" = '70000000-0000-4000-8000-000000000001' WHERE "game_id" = '10000000-0000-4000-8000-000000000001';
UPDATE "echo_main_stats" SET "release_id" = '70000000-0000-4000-8000-000000000001' WHERE "game_id" = '10000000-0000-4000-8000-000000000001';
UPDATE "build_profiles" SET "data_release_id" = '70000000-0000-4000-8000-000000000001' WHERE "character_id" IN (SELECT "id" FROM "characters" WHERE "release_id" = '70000000-0000-4000-8000-000000000001');
UPDATE "games" SET "current_data_release_id" = '70000000-0000-4000-8000-000000000001' WHERE "id" = '10000000-0000-4000-8000-000000000001';
--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "release_id" SET NOT NULL;
ALTER TABLE "weapons" ALTER COLUMN "release_id" SET NOT NULL;
ALTER TABLE "echoes" ALTER COLUMN "release_id" SET NOT NULL;
ALTER TABLE "echo_sets" ALTER COLUMN "release_id" SET NOT NULL;
ALTER TABLE "echo_main_stats" ALTER COLUMN "release_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_current_data_release_id_game_data_releases_id_fk" FOREIGN KEY ("current_data_release_id") REFERENCES "public"."game_data_releases"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "characters" ADD CONSTRAINT "characters_release_id_game_data_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."game_data_releases"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "weapons" ADD CONSTRAINT "weapons_release_id_game_data_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."game_data_releases"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "echoes" ADD CONSTRAINT "echoes_release_id_game_data_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."game_data_releases"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "echo_sets" ADD CONSTRAINT "echo_sets_release_id_game_data_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."game_data_releases"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "echo_main_stats" ADD CONSTRAINT "echo_main_stats_release_id_game_data_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."game_data_releases"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "build_profiles" ADD CONSTRAINT "build_profiles_data_release_id_game_data_releases_id_fk" FOREIGN KEY ("data_release_id") REFERENCES "public"."game_data_releases"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
DROP INDEX "character_game_key_idx";
DROP INDEX "weapon_game_key_idx";
DROP INDEX "echo_game_key_idx";
DROP INDEX "echo_set_game_key_idx";
DROP INDEX "echo_main_stat_game_cost_key_idx";
CREATE UNIQUE INDEX "character_release_key_idx" ON "characters" USING btree ("release_id","external_key");
CREATE UNIQUE INDEX "weapon_release_key_idx" ON "weapons" USING btree ("release_id","external_key");
CREATE UNIQUE INDEX "echo_release_key_idx" ON "echoes" USING btree ("release_id","external_key");
CREATE UNIQUE INDEX "echo_set_release_key_idx" ON "echo_sets" USING btree ("release_id","external_key");
CREATE UNIQUE INDEX "echo_main_stat_release_cost_key_idx" ON "echo_main_stats" USING btree ("release_id","cost","stat_key");
