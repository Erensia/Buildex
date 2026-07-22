CREATE TABLE "party_buffs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "release_id" uuid NOT NULL,
  "target_character_key" varchar(80) NOT NULL,
  "provider_character_key" varchar(80) NOT NULL,
  "external_key" varchar(80) NOT NULL,
  "label" varchar(160) NOT NULL,
  "condition" text NOT NULL,
  "stats" jsonb NOT NULL,
  CONSTRAINT "party_buffs_release_id_game_data_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."game_data_releases"("id") ON DELETE restrict ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "party_buff_release_key_idx" ON "party_buffs" USING btree ("release_id", "external_key");
--> statement-breakpoint
INSERT INTO "party_buffs" ("release_id", "target_character_key", "provider_character_key", "external_key", "label", "condition", "stats") VALUES
  ('70000000-0000-4000-8000-000000000001', 'changli', 'lupa', 'lupa-fusion-window', '루파: 화염 지원 창', '루파의 공명 해방 효과가 활성화된 동안', '{"fusionDamageBonus":15}'::jsonb),
  ('70000000-0000-4000-8000-000000000001', 'changli', 'brant', 'brant-fusion-window', '브렌트: 화염 지원 창', '브렌트의 조건부 지원 효과가 활성화된 동안', '{"fusionDamageBonus":20,"resonanceSkillDamageBonus":25}'::jsonb);
