import { NextResponse } from "next/server";
import { calculateBuildStats, evaluateBuildGrade } from "@/lib/formula/build-calculator";
import { CHANGLI_LUPA_BRANT_BUFFS, CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS } from "@/lib/formula/changli-lupa-brant";
import { ZANI_S0_GRADE_REQUIREMENTS } from "@/lib/formula/zani-phoebe-verina";
import { HIYUKI_CHISA_LUCILLA_BUFFS, HIYUKI_S0_SIGNATURE_GRADE_REQUIREMENTS } from "@/lib/formula/hiyuki-chisa-lucilla";
import { FORMULA_VERSION } from "@/lib/formula/versions";
import { resolveEchoSetEffects } from "@/lib/formula/echo-sets";
import { getBuildProfilesForUser, getBuildReferences, getCurrentUser, validateBuildReferences } from "@/lib/build-profiles";
import { getDb } from "@/lib/db/client";
import { buildProfiles } from "@/lib/db/schema";
import { buildInputSchema } from "@/lib/validation/build";
import { getEchoStatSources } from "@/lib/build-calculation";

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
  const { character, weapon, sets, release } = references;
  if (!character || !weapon || !release) return NextResponse.json({ error: "지원하지 않는 캐릭터 또는 무기입니다." }, { status: 400 });

  const setEffects = resolveEchoSetEffects(parsed.data.echoes.map((echo) => echo.setKey), sets.map((set) => ({ externalKey: set.externalKey, name: set.name, effects: set.effects as Record<string, unknown> })));
  const result = calculateBuildStats({
    character: { id: character.externalKey, label: character.name, stats: character.baseStats as { baseAttack?: number; critRate?: number } },
    weapon: { id: weapon.externalKey, label: weapon.name, stats: weapon.stats as { baseAttack?: number; critDamage?: number } },
    echoes: [...getEchoStatSources(parsed.data, references.mainStats), ...setEffects.automaticSources],
    activeBuffIds: parsed.data.activeBuffIds,
  }, [...(character.externalKey === "changli" ? CHANGLI_LUPA_BRANT_BUFFS.filter((buff) => buff.id !== "changli-signature-max-stacks" || weapon.externalKey === "blazing-brilliance") : character.externalKey === "hiyuki" ? HIYUKI_CHISA_LUCILLA_BUFFS : []), ...setEffects.conditionalBuffs]);
  const calculatedResult = {
    ...result,
    grade: character.externalKey === "changli"
      ? evaluateBuildGrade(result, CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS).grade
      : character.externalKey === "zani"
        ? evaluateBuildGrade(result, ZANI_S0_GRADE_REQUIREMENTS).grade
        : character.externalKey === "hiyuki"
          ? evaluateBuildGrade(result, HIYUKI_S0_SIGNATURE_GRADE_REQUIREMENTS).grade
        : null,
  };
  const [profile] = await getDb().insert(buildProfiles).values({
    userId: user.id,
    characterId: character.id,
    weaponId: weapon.id,
    name: parsed.data.name,
    buildInput: parsed.data,
    calculatedResult,
    dataVersion: release.version,
    dataReleaseId: release.id,
    formulaVersion: FORMULA_VERSION,
  }).returning();

  return NextResponse.json(profile, { status: 201 });
}
