-- Some echoes had "stats" stored as the JSON *string* "{}" instead of an
-- empty JSON *object* {}. Object.entries() on a JS string iterates its
-- characters, so validateRelease saw keys "0"/"1" with values "{"/"}" and
-- rejected every release containing them -- including the currently
-- published 3.5.1 release, which blocked re-publishing it unchanged.
-- Fixes both the current published release and the preserved prior release
-- so historical data stays internally consistent.
UPDATE "echoes" SET "stats" = '{}'::jsonb WHERE "stats"::text = '"{}"';
