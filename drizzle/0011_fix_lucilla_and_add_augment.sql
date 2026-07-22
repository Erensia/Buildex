UPDATE "characters" SET "base_stats" = CASE WHEN jsonb_typeof("base_stats") = 'object' THEN jsonb_set("base_stats", '{weaponType}', '"rectifier"'::jsonb, true) ELSE '{"weaponType":"rectifier"}'::jsonb END WHERE "external_key" = 'lucilla' AND "base_stats" ->> 'weaponType' IS NULL;

INSERT INTO "weapons" ("game_id", "release_id", "external_key", "name", "weapon_type", "data_version", "source_snapshot", "source_url", "stats")
SELECT r."game_id", r."id", 'augment', '청음', 'rectifier', r."version", r."source_snapshot", 'https://wutheringwaves.fandom.com/wiki/Augment', '{"baseAttack":412,"critRate":20.3,"level":90,"refinement":1}'::jsonb
FROM "game_data_releases" r
ON CONFLICT ("release_id", "external_key") DO NOTHING;
