UPDATE "weapons" SET "stats" = ("stats" #>> '{}')::jsonb WHERE jsonb_typeof("stats") = 'string';
UPDATE "weapons" SET "stats" = jsonb_set("stats" - 'critRate', '{energyRegen}', '77'::jsonb, true) WHERE "external_key" = 'unflickering-valour';
