import { z } from "zod";

const sourceFields = {
  dataVersion: z.string().trim().min(1).max(32),
  sourceSnapshot: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다."),
  sourceUrl: z.url("유효한 출처 URL을 입력해 주세요."),
};

const gameSlug = z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/);
const externalKey = z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/);
const jsonObject = z.record(z.string(), z.unknown());

export const gameDataSchema = z.discriminatedUnion("entity", [
  z.object({ entity: z.literal("game"), slug: gameSlug, name: z.string().trim().min(1).max(120), isActive: z.boolean().default(true), ...sourceFields }),
  z.object({ entity: z.literal("character"), gameSlug, externalKey, name: z.string().trim().min(1).max(80), role: z.string().trim().min(1).max(40), baseStats: jsonObject, ...sourceFields }),
  z.object({ entity: z.literal("weapon"), gameSlug, externalKey, name: z.string().trim().min(1).max(80), weaponType: z.string().trim().min(1).max(40), stats: jsonObject, ...sourceFields }),
  z.object({ entity: z.literal("echo"), gameSlug, externalKey, name: z.string().trim().min(1).max(80), cost: z.number().int().min(1).max(4), stats: jsonObject, ...sourceFields }),
  z.object({ entity: z.literal("echoSet"), gameSlug, externalKey, name: z.string().trim().min(1).max(80), effects: jsonObject, ...sourceFields }),
  z.object({ entity: z.literal("mainStat"), gameSlug, cost: z.number().int().min(1).max(4), statKey: z.string().trim().min(1).max(80), value: z.number().int().min(0), ...sourceFields }),
  z.object({ entity: z.literal("echoSetMembership"), gameSlug, echoSetKey: externalKey, echoKey: externalKey }),
]);

export type GameDataInput = z.infer<typeof gameDataSchema>;

export const deleteGameDataSchema = z.discriminatedUnion("entity", [
  z.object({ entity: z.literal("game"), slug: gameSlug }),
  z.object({ entity: z.enum(["character", "weapon", "echo", "echoSet"]), gameSlug, externalKey }),
  z.object({ entity: z.literal("mainStat"), gameSlug, cost: z.number().int(), statKey: z.string().trim().min(1).max(80) }),
  z.object({ entity: z.literal("echoSetMembership"), gameSlug, echoSetKey: externalKey, echoKey: externalKey }),
]);
