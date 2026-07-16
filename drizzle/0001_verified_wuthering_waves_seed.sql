ALTER TABLE "games" ALTER COLUMN "current_data_version" DROP NOT NULL;
ALTER TABLE "games" ADD COLUMN "source_snapshot" varchar(10);
ALTER TABLE "games" ADD COLUMN "source_url" text;
ALTER TABLE "characters" ALTER COLUMN "data_version" DROP NOT NULL;
ALTER TABLE "characters" ADD COLUMN "source_snapshot" varchar(10) NOT NULL;
ALTER TABLE "characters" ADD COLUMN "source_url" text NOT NULL;
ALTER TABLE "weapons" ALTER COLUMN "data_version" DROP NOT NULL;
ALTER TABLE "weapons" ADD COLUMN "source_snapshot" varchar(10) NOT NULL;
ALTER TABLE "weapons" ADD COLUMN "source_url" text NOT NULL;
ALTER TABLE "echoes" ALTER COLUMN "data_version" DROP NOT NULL;
ALTER TABLE "echoes" ADD COLUMN "source_snapshot" varchar(10) NOT NULL;
ALTER TABLE "echoes" ADD COLUMN "source_url" text NOT NULL;
--> statement-breakpoint
CREATE TABLE "echo_sets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"external_key" varchar(80) NOT NULL,
	"name" varchar(80) NOT NULL,
	"data_version" varchar(32),
	"source_snapshot" varchar(10) NOT NULL,
	"source_url" text NOT NULL,
	"effects" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "echo_set_echoes" (
	"echo_set_id" uuid NOT NULL,
	"echo_id" uuid NOT NULL,
	CONSTRAINT "echo_set_echoes_echo_set_id_echo_id_pk" PRIMARY KEY("echo_set_id","echo_id")
);
--> statement-breakpoint
CREATE TABLE "echo_main_stats" (
	"id" uuid PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"cost" integer NOT NULL,
	"stat_key" varchar(80) NOT NULL,
	"value" integer NOT NULL,
	"data_version" varchar(32),
	"source_snapshot" varchar(10) NOT NULL,
	"source_url" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "echo_sets" ADD CONSTRAINT "echo_sets_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "echo_set_echoes" ADD CONSTRAINT "echo_set_echoes_echo_set_id_echo_sets_id_fk" FOREIGN KEY ("echo_set_id") REFERENCES "public"."echo_sets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "echo_set_echoes" ADD CONSTRAINT "echo_set_echoes_echo_id_echoes_id_fk" FOREIGN KEY ("echo_id") REFERENCES "public"."echoes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "echo_main_stats" ADD CONSTRAINT "echo_main_stats_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "echo_set_game_key_idx" ON "echo_sets" USING btree ("game_id","external_key");
CREATE UNIQUE INDEX "echo_main_stat_game_cost_key_idx" ON "echo_main_stats" USING btree ("game_id","cost","stat_key");
--> statement-breakpoint
INSERT INTO "games" ("id", "slug", "name", "current_data_version", "source_snapshot", "source_url") VALUES
  ('10000000-0000-4000-8000-000000000001', 'wuthering-waves', '명조: 워더링 웨이브', '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C');
--> statement-breakpoint
INSERT INTO "characters" ("id", "game_id", "external_key", "name", "role", "data_version", "source_snapshot", "source_url", "base_stats") VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'changli', '장리', '메인 딜러', '3.5', '2026-07-16', 'https://namu.moe/w/%EC%9E%A5%EB%A6%AC', '{"baseAttack":462,"element":"fusion","weaponType":"sword","level":90}'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'lupa', '루파', '서브 딜러·빠른 협주', '3.5', '2026-07-16', 'https://namu.moe/w/%EB%A3%A8%ED%8C%8C', '{"baseAttack":387,"element":"fusion","weaponType":"broadblade","level":90}'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'brant', '브렌트', '서브 딜러·생존 치료', '3.5', '2026-07-16', 'https://namu.moe/w/%EB%B8%8C%EB%A0%8C%ED%8A%B8%28%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C%29', '{"baseAttack":375,"element":"fusion","weaponType":"sword","level":90}');
--> statement-breakpoint
INSERT INTO "weapons" ("id", "game_id", "external_key", "name", "weapon_type", "data_version", "source_snapshot", "source_url", "stats") VALUES
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'blazing-brilliance', '솟아오르는 화염', 'sword', '3.5', '2026-07-16', 'https://namu.moe/w/%EC%9E%A5%EB%A6%AC', '{"baseAttack":588,"critDamage":48.6,"level":90,"refinement":1,"conditionalEffects":[{"id":"changli-signature-max-stacks","stats":{"attackPercent":12,"resonanceSkillDamageBonus":56}}]}'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'wildfire-mark', '불길', 'broadblade', '3.5', '2026-07-16', 'https://namu.moe/w/%EB%A3%A8%ED%8C%8C', '{"baseAttack":587,"critDamage":48.6,"attackPercent":12,"level":90,"refinement":1,"conditionalEffects":[{"id":"lupa-party-fusion","durationSeconds":30,"stats":{"fusionDamageBonus":24}}]}'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'unflickering-valour', '흔들리지 않는 용기', 'sword', '3.5', '2026-07-16', 'https://namu.moe/w/%EB%B8%8C%EB%A0%8C%ED%8A%B8%28%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C%29', '{"baseAttack":412,"energyRegen":77,"critRate":8,"level":90,"refinement":1,"conditionalEffects":[{"id":"brant-signature-resonance-liberation","stats":{"basicAttackDamageBonus":24}},{"id":"brant-signature-basic-hit","stats":{"basicAttackDamageBonus":24}}]}');
--> statement-breakpoint
INSERT INTO "echoes" ("id", "game_id", "external_key", "name", "cost", "data_version", "source_snapshot", "source_url", "stats") VALUES
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'nightmare-inferno-rider', '악몽 · 지옥불 기사', 4, '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C/%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%85%98', '{"recommendedFor":"changli"}'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'lioness-of-glory', '영광의 사자', 4, '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C/%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%85%98', '{"recommendedFor":"lupa"}'),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'dragon-of-dirge', '탄식의 고룡', 4, '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C/%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%85%98', '{"recommendedFor":"brant"}');
--> statement-breakpoint
INSERT INTO "echo_sets" ("id", "game_id", "external_key", "name", "data_version", "source_snapshot", "source_url", "effects") VALUES
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'molten-rift', '솟구치는 용암', '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C/%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%85%98', '{"twoPiece":{"fusionDamageBonus":10},"fivePiece":{"condition":"공명 스킬 사용 후 15초","fusionDamageBonus":30}}'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'flaming-clawprint', '울부짖는 늑대의 불꽃', '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C/%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%85%98', '{"twoPiece":{"fusionDamageBonus":10},"fivePiece":{"condition":"공명 해방 발동 후 35초","partyFusionDamageBonus":15,"selfResonanceLiberationDamageBonus":20}}'),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'tidebreaking-courage', '파도에 맞선 용기', '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C/%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%85%98', '{"twoPiece":{"energyRegen":10},"fivePiece":{"attackPercent":15,"condition":"공명 효율 250% 이상","allAttributeDamageBonus":30}}');
--> statement-breakpoint
INSERT INTO "echo_set_echoes" ("echo_set_id", "echo_id") VALUES
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001'),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002'),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003');
--> statement-breakpoint
INSERT INTO "echo_main_stats" ("id", "game_id", "cost", "stat_key", "value", "data_version", "source_snapshot", "source_url") VALUES
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 4, 'critRate', 22, '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C/%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%85%98'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 4, 'critDamage', 44, '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C/%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%85%98'),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 4, 'attackPercent', 33, '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C/%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%85%98'),
  ('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 3, 'fusionDamageBonus', 30, '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C/%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%85%98'),
  ('60000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 3, 'attackPercent', 30, '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C/%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%85%98'),
  ('60000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 3, 'energyRegen', 32, '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C/%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%85%98'),
  ('60000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 1, 'attackPercent', 18, '3.5', '2026-07-16', 'https://namu.moe/w/%EB%AA%85%EC%A1%B0%3A%20%EC%9B%8C%EB%8D%94%EB%A7%81%20%EC%9B%A8%EC%9D%B4%EB%B8%8C/%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%85%98');
