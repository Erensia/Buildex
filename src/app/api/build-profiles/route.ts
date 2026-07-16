import { NextResponse } from "next/server";
import { calculateBuildStats, evaluateBuildGrade } from "@/lib/formula/build-calculator";
import { CHANGLI_LUPA_BRANT_BUFFS, CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS } from "@/lib/formula/changli-lupa-brant";
import { FORMULA_VERSION } from "@/lib/formula/versions";
import { resolveEchoSetEffects } from "@/lib/formula/echo-sets";
import { getBuildProfilesForUser, getBuildReferences, getCurrentUser, validateBuildReferences } from "@/lib/build-profiles";
import { getDb } from "@/lib/db/client";
import { buildProfiles } from "@/lib/db/schema";
import { buildInputSchema } from "@/lib/validation/build";

const mainStatValues: Record<number, Record<string, number>> = {
  1: { attackPercent: 18 },
  3: { fusionDamageBonus: 30, attackPercent: 30, energyRegen: 32 },
  4: { critRate: 22, critDamage: 44, attackPercent: 33 },
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return NextResponse.json(await getBuildProfilesForUser(user.id));
}

export async function POST(request: Request) {
  const parsed = buildInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "빌드 입력값을 확인해주세요." }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const references = await getBuildReferences(parsed.data.characterKey, parsed.data.weaponKey, parsed.data.echoes.map((echo) => echo.setKey), parsed.data.echoes.map((echo) => echo.echoKey));
  const referenceError = validateBuildReferences(parsed.data, references);
  if (referenceError) return NextResponse.json({ error: referenceError }, { status: 400 });
  const { character, weapon, sets } = references;
  if (!character || !weapon) return NextResponse.json({ error: "지원하지 않는 캐릭터 또는 무기입니다." }, { status: 400 });

  const setEffects = resolveEchoSetEffects(parsed.data.echoes.map((echo) => echo.setKey), sets.map((set) => ({ externalKey: set.externalKey, name: set.name, effects: set.effects as Record<string, unknown> })));
  const result = calculateBuildStats({
    character: { id: character.externalKey, label: character.name, stats: character.baseStats as { baseAttack?: number; critRate?: number } },
    weapon: { id: weapon.externalKey, label: weapon.name, stats: weapon.stats as { baseAttack?: number; critDamage?: number } },
    echoes: [...parsed.data.echoes.map((echo) => ({
      id: `echo-${echo.slot}`,
      label: `에코 ${echo.slot}`,
      stats: {
        [echo.mainStat]: mainStatValues[echo.cost][echo.mainStat] ?? 0,
        ...Object.fromEntries(echo.subStats.map((stat) => [stat.key, stat.value])),
      },
    })), ...setEffects.automaticSources],
    activeBuffIds: parsed.data.activeBuffIds,
  }, [...(character.externalKey === "changli" ? CHANGLI_LUPA_BRANT_BUFFS : []), ...setEffects.conditionalBuffs]);
  const calculatedResult = {
    ...result,
    grade: character.externalKey === "changli"
      ? evaluateBuildGrade(result, CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS).grade
      : null,
  };
  const [profile] = await getDb().insert(buildProfiles).values({
    userId: user.id,
    characterId: character.id,
    weaponId: weapon.id,
    name: parsed.data.name,
    buildInput: parsed.data,
    calculatedResult,
    dataVersion: character.dataVersion ?? "3.5",
    formulaVersion: FORMULA_VERSION,
  }).returning();

  return NextResponse.json(profile, { status: 201 });
}
