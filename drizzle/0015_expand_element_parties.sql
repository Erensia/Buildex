-- Published 3.5.1 snapshot. Existing saved builds remain pinned to the prior
-- release; the public library reads the new release through games.current_data_release_id.
INSERT INTO "game_data_releases" ("id", "game_id", "version", "status", "source_snapshot", "source_manifest", "notes") VALUES
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '3.5.1', 'draft', '2026-07-22', '[{"label":"Character verification draft","url":"https://wuthering.gg/characters"}]'::jsonb, 'Expanded Aero, Electro, and Havoc party candidates');
--> statement-breakpoint
INSERT INTO "characters" ("game_id", "release_id", "external_key", "name", "role", "data_version", "source_snapshot", "source_url", "base_stats")
SELECT "game_id", '70000000-0000-4000-8000-000000000002', "external_key", "name", "role", '3.5.1', '2026-07-22', "source_url", "base_stats"
FROM "characters" WHERE "release_id" = '70000000-0000-4000-8000-000000000001';
--> statement-breakpoint
INSERT INTO "characters" ("game_id", "release_id", "external_key", "name", "role", "data_version", "source_snapshot", "source_url", "base_stats") VALUES
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'jiyan', '기염', '메인 딜러 · 대검', '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/jiyan', '{"baseAttack":437,"element":"aero","weaponType":"broadblade","level":90}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'mortefi', '모르테피', '서브 딜러 · 권총', '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/mortefi', '{"baseAttack":250,"element":"fusion","weaponType":"pistol","level":90}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'verina', '벨리나', '힐러 · 서포터 · 증폭기', '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/verina', '{"baseAttack":337,"element":"spectro","weaponType":"rectifier","level":90}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'iuno', '유노', '메인 딜러 · 권갑', '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/iuno', '{"baseAttack":450,"element":"aero","weaponType":"gauntlet","level":90}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'jianxin', '감심', '서포터 · 생존 치료 · 권갑', '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/jianxin', '{"baseAttack":337,"element":"aero","weaponType":"gauntlet","level":90}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'xiangli-yao', '상리요', '메인 딜러 · 권갑', '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/xiangli-yao', '{"baseAttack":425,"element":"electro","weaponType":"gauntlet","level":90}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'yinlin', '음림', '서브 딜러 · 증폭기', '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/yinlin', '{"baseAttack":400,"element":"electro","weaponType":"rectifier","level":90}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'camellya', '카멜리아', '메인 딜러 · 직검', '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/camellya', '{"baseAttack":450,"element":"havoc","weaponType":"sword","level":90}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'roccia', '로코코', '서브 딜러 · 권갑', '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/roccia', '{"baseAttack":375,"element":"havoc","weaponType":"gauntlet","level":90}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'rover-havoc', '파수인', '서브 딜러 · 직검', '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/rover-havoc', '{"baseAttack":412,"element":"havoc","weaponType":"sword","level":90}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'yangyang-xuanling', '양양·현령', '메인 딜러 · 직검', '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/yangyang-xuanling', '{"baseAttack":425,"element":"havoc","weaponType":"sword","level":90}'::jsonb)
ON CONFLICT ("release_id", "external_key") DO UPDATE SET
  "name" = EXCLUDED."name", "role" = EXCLUDED."role", "data_version" = EXCLUDED."data_version", "source_snapshot" = EXCLUDED."source_snapshot", "source_url" = EXCLUDED."source_url", "base_stats" = EXCLUDED."base_stats";
--> statement-breakpoint
INSERT INTO "weapons" ("game_id", "release_id", "external_key", "name", "weapon_type", "data_version", "source_snapshot", "source_url", "stats")
SELECT "game_id", '70000000-0000-4000-8000-000000000002', "external_key", "name", "weapon_type", '3.5.1', '2026-07-22', "source_url", "stats"
FROM "weapons" WHERE "release_id" = '70000000-0000-4000-8000-000000000001';
--> statement-breakpoint
INSERT INTO "weapons" ("game_id", "release_id", "external_key", "name", "weapon_type", "data_version", "source_snapshot", "source_url", "stats") VALUES
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'static-mist', '정적의 안개', 'pistol', '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/mortefi', '{"baseAttack":587.5,"critRate":24.3,"level":90,"refinement":1}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'abyss-surges', '심연의 파도', 'gauntlet', '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/jianxin', '{"baseAttack":587.5,"attackPercent":36.45,"level":90,"refinement":1}'::jsonb)
ON CONFLICT ("release_id", "external_key") DO UPDATE SET
  "name" = EXCLUDED."name", "weapon_type" = EXCLUDED."weapon_type", "data_version" = EXCLUDED."data_version", "source_snapshot" = EXCLUDED."source_snapshot", "source_url" = EXCLUDED."source_url", "stats" = EXCLUDED."stats";
--> statement-breakpoint
INSERT INTO "echoes" ("game_id", "release_id", "external_key", "name", "cost", "data_version", "source_snapshot", "source_url", "stats")
SELECT "game_id", '70000000-0000-4000-8000-000000000002', "external_key", "name", "cost", '3.5.1', '2026-07-22', "source_url", "stats"
FROM "echoes" WHERE "release_id" = '70000000-0000-4000-8000-000000000001';
--> statement-breakpoint
INSERT INTO "echo_sets" ("game_id", "release_id", "external_key", "name", "data_version", "source_snapshot", "source_url", "effects")
SELECT "game_id", '70000000-0000-4000-8000-000000000002', "external_key", "name", '3.5.1', '2026-07-22', "source_url", "effects"
FROM "echo_sets" WHERE "release_id" = '70000000-0000-4000-8000-000000000001';
--> statement-breakpoint
INSERT INTO "echo_main_stats" ("game_id", "release_id", "cost", "stat_key", "value", "data_version", "source_snapshot", "source_url")
SELECT "game_id", '70000000-0000-4000-8000-000000000002', "cost", "stat_key", "value", '3.5.1', '2026-07-22', "source_url"
FROM "echo_main_stats" WHERE "release_id" = '70000000-0000-4000-8000-000000000001';
--> statement-breakpoint
INSERT INTO "echo_main_stats" ("game_id", "release_id", "cost", "stat_key", "value", "data_version", "source_snapshot", "source_url") VALUES
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 3, 'aeroDamageBonus', 30, '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/jiyan'),
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 3, 'electroDamageBonus', 30, '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/xiangli-yao'),
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 3, 'havocDamageBonus', 30, '3.5.1', '2026-07-22', 'https://wuthering.gg/characters/camellya');
--> statement-breakpoint
INSERT INTO "echo_set_echoes" ("echo_set_id", "echo_id")
SELECT new_set."id", new_echo."id"
FROM "echo_set_echoes" membership
JOIN "echo_sets" old_set ON old_set."id" = membership."echo_set_id"
JOIN "echoes" old_echo ON old_echo."id" = membership."echo_id"
JOIN "echo_sets" new_set ON new_set."release_id" = '70000000-0000-4000-8000-000000000002' AND new_set."external_key" = old_set."external_key"
JOIN "echoes" new_echo ON new_echo."release_id" = '70000000-0000-4000-8000-000000000002' AND new_echo."external_key" = old_echo."external_key"
WHERE old_set."release_id" = '70000000-0000-4000-8000-000000000001' AND old_echo."release_id" = '70000000-0000-4000-8000-000000000001';
--> statement-breakpoint
INSERT INTO "party_buffs" ("release_id", "target_character_key", "provider_character_key", "external_key", "label", "condition", "stats")
SELECT '70000000-0000-4000-8000-000000000002', "target_character_key", "provider_character_key", "external_key", "label", "condition", "stats"
FROM "party_buffs" WHERE "release_id" = '70000000-0000-4000-8000-000000000001';
--> statement-breakpoint
UPDATE "game_data_releases" SET "status" = 'superseded' WHERE "id" = '70000000-0000-4000-8000-000000000001' AND "status" = 'published';
--> statement-breakpoint
UPDATE "game_data_releases" SET "status" = 'published', "published_at" = now() WHERE "id" = '70000000-0000-4000-8000-000000000002';
--> statement-breakpoint
UPDATE "games" SET "current_data_release_id" = '70000000-0000-4000-8000-000000000002', "current_data_version" = '3.5.1', "source_snapshot" = '2026-07-22', "updated_at" = now() WHERE "id" = '10000000-0000-4000-8000-000000000001';
