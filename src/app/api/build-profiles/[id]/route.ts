import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedBuildProfile } from "@/lib/build-profiles";
import { getDb } from "@/lib/db/client";
import { buildProfiles } from "@/lib/db/schema";
import { buildInputSchema } from "@/lib/validation/build";
import { getBuildReferences } from "@/lib/build-profiles";
import { calculateBuildStats, evaluateBuildGrade } from "@/lib/formula/build-calculator";
import { CHANGLI_LUPA_BRANT_BUFFS, CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS } from "@/lib/formula/changli-lupa-brant";

const mainStatValues: Record<number, Record<string, number>> = {
  1: { attackPercent: 18 },
  3: { fusionDamageBonus: 30, attackPercent: 30, energyRegen: 32 },
  4: { critRate: 22, critDamage: 44, attackPercent: 33 },
};

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

  const { character, weapon } = await getBuildReferences(parsed.data.characterKey, parsed.data.weaponKey);
  if (!character || !weapon) return NextResponse.json({ error: "Selected character or weapon was not found." }, { status: 400 });
  const result = calculateBuildStats({
    character: { id: character.externalKey, label: character.name, stats: character.baseStats as { baseAttack?: number; critRate?: number } },
    weapon: { id: weapon.externalKey, label: weapon.name, stats: weapon.stats as { baseAttack?: number; critDamage?: number } },
    echoes: parsed.data.echoes.map((echo) => ({
      id: `echo-${echo.slot}`,
      label: `Echo ${echo.slot}`,
      stats: { [echo.mainStat]: mainStatValues[echo.cost][echo.mainStat] ?? 0, ...Object.fromEntries(echo.subStats.map((stat) => [stat.key, stat.value])) },
    })),
    activeBuffIds: parsed.data.activeBuffIds,
  }, character.externalKey === "changli" ? CHANGLI_LUPA_BRANT_BUFFS : []);
  const calculatedResult = {
    ...result,
    grade: character.externalKey === "changli"
      ? evaluateBuildGrade(result, CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS).grade
      : null,
  };
  const [updated] = await getDb().update(buildProfiles).set({
    characterId: character.id,
    weaponId: weapon.id,
    name: parsed.data.name,
    buildInput: parsed.data,
    calculatedResult,
    dataVersion: character.dataVersion ?? "3.5",
    formulaVersion: parsed.data.formulaVersion,
    updatedAt: new Date(),
  }).where(eq(buildProfiles.id, profile.id)).returning();
  return NextResponse.json(updated);
}
