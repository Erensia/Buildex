INSERT INTO "echoes" ("id", "game_id", "external_key", "name", "cost", "data_version", "source_snapshot", "source_url", "stats") VALUES
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'fusion-dreadmane', '갈기늑대 · 불꽃', 1, '3.5', '2026-07-16', 'https://wutheringwaves.fandom.com/wiki/Molten_Rift', '{"recommendedFor":"changli"}'),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'violet-feathered-heron', '보라빛 깃털 왜가리', 3, '3.5', '2026-07-16', 'https://wutheringwaves.fandom.com/wiki/Molten_Rift', '{"recommendedFor":"changli"}'),
  ('40000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'aero-drake', '비룡', 1, '3.5', '2026-07-16', 'https://wutheringwaves.fandom.com/wiki/Tidebreaking_Courage', '{"recommendedFor":"brant"}'),
  ('40000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'hurriclaw', '허리클로', 3, '3.5', '2026-07-16', 'https://wutheringwaves.fandom.com/wiki/Tidebreaking_Courage', '{"recommendedFor":"brant"}');
--> statement-breakpoint
INSERT INTO "echo_set_echoes" ("echo_set_id", "echo_id") VALUES
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004'),
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000005'),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000006'),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000007');
