-- The older release stored Chisa's JSON object as a JSON string. Normalize the
-- current public release so weapon compatibility and the planner read it safely.
UPDATE "characters"
SET "base_stats" = '{"baseAttack":437.5,"critRate":5,"critDamage":150,"energyRegen":100,"element":"havoc","weaponType":"broadblade","level":90}'::jsonb
WHERE "release_id" = '70000000-0000-4000-8000-000000000002'
  AND "external_key" = 'chisa'
  AND jsonb_typeof("base_stats") = 'string';
