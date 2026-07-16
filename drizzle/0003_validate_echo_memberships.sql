INSERT INTO "echoes" ("id", "game_id", "external_key", "name", "cost", "data_version", "source_snapshot", "source_url", "stats") VALUES
  ('40000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'corrosaurus', '코로사우루스', 3, '3.5', '2026-07-16', 'https://wutheringwaves.fandom.com/wiki/Flaming_Clawprint', '{"recommendedFor":"lupa"}');
--> statement-breakpoint
INSERT INTO "echo_set_echoes" ("echo_set_id", "echo_id") VALUES
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000006'),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000008');
