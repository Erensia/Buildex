import { z } from "zod";
import { SUPPORTED_STAT_KEYS } from "@/lib/formula/stats";

const sourceFields = {
  dataVersion: z.string().trim().min(1).max(32),
  sourceSnapshot: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다."),
  sourceUrl: z.url("유효한 출처 URL을 입력해 주세요."),
};

const gameSlug = z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/);
const externalKey = z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/);
const jsonObject = z.record(z.string(), z.unknown());
const statValueKeys = new Set<string>([...SUPPORTED_STAT_KEYS, "level", "refinement"]);
const statObject = jsonObject.superRefine((value, context) => {
  for (const [key, statValue] of Object.entries(value)) {
    if (!statValueKeys.has(key)) context.addIssue({ code: "custom", path: [key], message: `지원하지 않는 스탯 키입니다: ${key}` });
    if (typeof statValue !== "number" || !Number.isFinite(statValue)) context.addIssue({ code: "custom", path: [key], message: "스탯 값은 유한한 숫자여야 합니다." });
  }
});
const characterBaseStats = jsonObject.superRefine((value, context) => {
  if (typeof value.baseAttack !== "number" || !Number.isFinite(value.baseAttack) || value.baseAttack < 0) context.addIssue({ code: "custom", path: ["baseAttack"], message: "baseAttack은 0 이상의 유한한 숫자여야 합니다." });
  if (typeof value.weaponType !== "string" || !value.weaponType.trim()) context.addIssue({ code: "custom", path: ["weaponType"], message: "weaponType이 필요합니다." });
  if (typeof value.element !== "string" || !value.element.trim()) context.addIssue({ code: "custom", path: ["element"], message: "element가 필요합니다." });
});
const draftScope = { releaseId: z.uuid(), gameSlug };
const partyBundleMember = z.object({
  externalKey,
  name: z.string().trim().min(1).max(80),
  role: z.string().trim().min(1).max(40),
  baseStats: characterBaseStats,
  sourceUrl: z.url("유효한 캐릭터 출처 URL을 입력해 주세요."),
});

export const gameDataSchema = z.discriminatedUnion("entity", [
  z.object({ entity: z.literal("game"), slug: gameSlug, name: z.string().trim().min(1).max(120), isActive: z.boolean().default(true), ...sourceFields }),
  z.object({ entity: z.literal("character"), ...draftScope, externalKey, name: z.string().trim().min(1).max(80), role: z.string().trim().min(1).max(40), baseStats: characterBaseStats, ...sourceFields }),
  z.object({ entity: z.literal("weapon"), ...draftScope, externalKey, name: z.string().trim().min(1).max(80), weaponType: z.string().trim().min(1).max(40), stats: statObject, ...sourceFields }),
  z.object({ entity: z.literal("echo"), ...draftScope, externalKey, name: z.string().trim().min(1).max(80), cost: z.number().int().min(1).max(4), stats: statObject, ...sourceFields }),
  z.object({ entity: z.literal("echoSet"), ...draftScope, externalKey, name: z.string().trim().min(1).max(80), effects: jsonObject, ...sourceFields }),
  z.object({ entity: z.literal("mainStat"), ...draftScope, cost: z.number().int().min(1).max(4), statKey: z.enum(SUPPORTED_STAT_KEYS), value: z.number().int().min(0), ...sourceFields }),
  z.object({ entity: z.literal("echoSetMembership"), ...draftScope, echoSetKey: externalKey, echoKey: externalKey }),
  z.object({ entity: z.literal("partyBundle"), ...draftScope, partyName: z.string().trim().min(1).max(120), focusElement: z.string().trim().min(1).max(40), members: z.array(partyBundleMember).length(3).superRefine((members, context) => {
    const keys = new Set<string>();
    for (const [index, member] of members.entries()) {
      if (keys.has(member.externalKey)) context.addIssue({ code: "custom", path: [index, "externalKey"], message: "파티 내 캐릭터 키는 중복될 수 없습니다." });
      keys.add(member.externalKey);
    }
  }), ...sourceFields }),
]);

export type GameDataInput = z.infer<typeof gameDataSchema>;

export const deleteGameDataSchema = z.discriminatedUnion("entity", [
  z.object({ entity: z.literal("game"), slug: gameSlug }),
  z.object({ entity: z.enum(["character", "weapon", "echo", "echoSet"]), ...draftScope, externalKey }),
  z.object({ entity: z.literal("mainStat"), ...draftScope, cost: z.number().int(), statKey: z.string().trim().min(1).max(80) }),
  z.object({ entity: z.literal("echoSetMembership"), ...draftScope, echoSetKey: externalKey, echoKey: externalKey }),
]);

export const releaseActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("createDraft"), gameSlug, version: z.string().trim().min(1).max(32), sourceSnapshot: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), sourceManifest: z.array(z.object({ label: z.string().trim().min(1).max(120), url: z.url() })).min(1), notes: z.string().trim().max(2000).optional() }),
  z.object({ action: z.literal("validate"), releaseId: z.uuid() }),
  z.object({ action: z.literal("diff"), releaseId: z.uuid() }),
  z.object({ action: z.literal("publish"), releaseId: z.uuid() }),
]);
