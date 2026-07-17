import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedBuildProfile, validateBuildReferences } from "@/lib/build-profiles";
import { getDb } from "@/lib/db/client";
import { buildProfiles } from "@/lib/db/schema";
import { buildInputSchema } from "@/lib/validation/build";
import { getBuildReferences } from "@/lib/build-profiles";
import { calculateBuildStats, evaluateBuildGrade } from "@/lib/formula/build-calculator";
import { CHANGLI_LUPA_BRANT_BUFFS, CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS } from "@/lib/formula/changli-lupa-brant";
import { ZANI_S0_GRADE_REQUIREMENTS } from "@/lib/formula/zani-phoebe-verina";
import { HIYUKI_CHISA_LUCILLA_BUFFS, HIYUKI_S0_SIGNATURE_GRADE_REQUIREMENTS } from "@/lib/formula/hiyuki-chisa-lucilla";
import { resolveEchoSetEffects } from "@/lib/formula/echo-sets";
import { getEchoStatSources } from "@/lib/build-calculation";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const profile = await getOwnedBuildProfile(id, user.id);
  if (!profile) return NextResponse.json({ error: "저장된 빌드를 찾을 수 없습니다." }, { status: 404 });
  await getDb().delete(buildProfiles).where(eq(buildProfiles.id, profile.id));
  return new NextResponse(null, { status: 204 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const parsed = buildInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid build data." }, { status: 400 });
  const { id } = await params;
  const profile = await getOwnedBuildProfile(id, user.id);
  if (!profile) return NextResponse.json({ error: "Build profile not found." }, { status: 404 });

  const references = await getBuildReferences(parsed.data.characterKey, parsed.data.weaponKey, parsed.data.echoes.map((echo) => echo.setKey), parsed.data.echoes.map((echo) => echo.echoKey));
  const referenceError = validateBuildReferences(parsed.data, references);
  if (referenceError) return NextResponse.json({ error: referenceError }, { status: 400 });
  const { character, weapon, sets, release } = references;
  if (!character || !weapon || !release) return NextResponse.json({ error: "Selected character or weapon was not found." }, { status: 400 });
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
  const [updated] = await getDb().update(buildProfiles).set({
    characterId: character.id,
    weaponId: weapon.id,
    name: parsed.data.name,
    buildInput: parsed.data,
    calculatedResult,
    dataVersion: release.version,
    dataReleaseId: release.id,
    formulaVersion: parsed.data.formulaVersion,
    updatedAt: new Date(),
  }).where(eq(buildProfiles.id, profile.id)).returning();
  return NextResponse.json(updated);
}
