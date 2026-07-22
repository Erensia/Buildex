import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db/client";
import { characters, echoMainStats, echoes, echoSetEchoes, echoSets, gameDataReleases, games, partyBuffs, weapons } from "@/lib/db/schema";
import { diffReleaseRows } from "@/lib/game-data/release-diff";
import { SUPPORTED_STAT_KEYS } from "@/lib/formula/stats";
import { releaseActionSchema } from "@/lib/validation/game-data";

async function requireAdmin() {
  return (await getCurrentAdmin()) ? null : NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
}

const supportedStatKeys = new Set<string>(SUPPORTED_STAT_KEYS);
const metadataStatKeys = new Set(["level", "refinement"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasInvalidStatValues(value: unknown, allowMetadata = false) {
  if (!isRecord(value)) return true;
  return Object.entries(value).some(([key, statValue]) =>
    !(supportedStatKeys.has(key) || (allowMetadata && metadataStatKeys.has(key))) || typeof statValue !== "number" || !Number.isFinite(statValue));
}

async function getReleaseDiff(releaseId: string) {
  const db = getDb();
  const release = await db.query.gameDataReleases.findFirst({ where: eq(gameDataReleases.id, releaseId) });
  if (!release) return { error: "릴리스를 찾을 수 없습니다." };
  const game = await db.query.games.findFirst({ where: eq(games.id, release.gameId) });
  if (!game?.currentDataReleaseId) return { error: "비교할 공개 릴리스를 찾을 수 없습니다." };
  const currentId = game.currentDataReleaseId;
  const [currentCharacters, draftCharacters, currentWeapons, draftWeapons, currentEchoes, draftEchoes, currentSets, draftSets, currentMainStats, draftMainStats] = await Promise.all([
    db.query.characters.findMany({ where: eq(characters.releaseId, currentId) }), db.query.characters.findMany({ where: eq(characters.releaseId, releaseId) }),
    db.query.weapons.findMany({ where: eq(weapons.releaseId, currentId) }), db.query.weapons.findMany({ where: eq(weapons.releaseId, releaseId) }),
    db.query.echoes.findMany({ where: eq(echoes.releaseId, currentId) }), db.query.echoes.findMany({ where: eq(echoes.releaseId, releaseId) }),
    db.query.echoSets.findMany({ where: eq(echoSets.releaseId, currentId) }), db.query.echoSets.findMany({ where: eq(echoSets.releaseId, releaseId) }),
    db.query.echoMainStats.findMany({ where: eq(echoMainStats.releaseId, currentId) }), db.query.echoMainStats.findMany({ where: eq(echoMainStats.releaseId, releaseId) }),
  ]);
  const mainStatRows = (rows: typeof currentMainStats) => rows.map((row) => ({ ...row, externalKey: `${row.cost}:${row.statKey}`, name: `${row.cost}코스트 · ${row.statKey}` }));
  return {
    baseReleaseId: currentId,
    baseVersion: (await db.query.gameDataReleases.findFirst({ where: eq(gameDataReleases.id, currentId) }))?.version ?? "unknown",
    diff: {
      characters: diffReleaseRows(currentCharacters, draftCharacters), weapons: diffReleaseRows(currentWeapons, draftWeapons),
      echoes: diffReleaseRows(currentEchoes, draftEchoes), echoSets: diffReleaseRows(currentSets, draftSets),
      mainStats: diffReleaseRows(mainStatRows(currentMainStats), mainStatRows(draftMainStats)),
    },
  };
}

async function validateRelease(releaseId: string) {
  const db = getDb();
  const release = await db.query.gameDataReleases.findFirst({ where: eq(gameDataReleases.id, releaseId) });
  if (!release) return { errors: ["릴리스를 찾을 수 없습니다."], release: null };
  const [characterRows, weaponRows, echoRows, setRows, mainStatRows, partyBuffRows] = await Promise.all([
    db.query.characters.findMany({ where: eq(characters.releaseId, releaseId) }),
    db.query.weapons.findMany({ where: eq(weapons.releaseId, releaseId) }),
    db.query.echoes.findMany({ where: eq(echoes.releaseId, releaseId) }),
    db.query.echoSets.findMany({ where: eq(echoSets.releaseId, releaseId) }),
    db.query.echoMainStats.findMany({ where: eq(echoMainStats.releaseId, releaseId) }),
    db.query.partyBuffs.findMany({ where: eq(partyBuffs.releaseId, releaseId) }),
  ]);
  const errors: string[] = [];
  if (!characterRows.length) errors.push("캐릭터가 한 명 이상 필요합니다.");
  if (!weaponRows.length) errors.push("무기가 한 개 이상 필요합니다.");
  if (!echoRows.length || !setRows.length || !mainStatRows.length) errors.push("에코·에코 세트·주옵션 데이터를 모두 등록해야 합니다.");
  if (!Array.isArray(release.sourceManifest) || !release.sourceManifest.length) errors.push("릴리스 출처가 한 개 이상 필요합니다.");
  if (characterRows.some((character) => !isRecord(character.baseStats) || typeof character.baseStats.baseAttack !== "number" || !Number.isFinite(character.baseStats.baseAttack) || character.baseStats.baseAttack < 0 || typeof character.baseStats.weaponType !== "string" || !character.baseStats.weaponType || typeof character.baseStats.element !== "string" || !character.baseStats.element)) errors.push("모든 캐릭터에는 유효한 기초 공격력·속성·무기 타입이 필요합니다.");
  if (weaponRows.some((weapon) => hasInvalidStatValues(weapon.stats, true)) || echoRows.some((echo) => hasInvalidStatValues(echo.stats))) errors.push("무기·에코 스탯에는 지원되는 유한한 숫자 키만 사용할 수 있습니다.");
  if (partyBuffRows.some((buff) => !characterRows.some((character) => character.externalKey === buff.targetCharacterKey) || !characterRows.some((character) => character.externalKey === buff.providerCharacterKey))) errors.push("파티 버프의 대상 또는 제공 캐릭터가 이 릴리스에 없습니다.");
  if (partyBuffRows.some((buff) => hasInvalidStatValues(buff.stats))) errors.push("파티 버프에는 지원되는 유한한 숫자 스탯 키만 사용할 수 있습니다.");
  const mismatched = [...characterRows, ...weaponRows, ...echoRows, ...setRows, ...mainStatRows].some((row) => row.dataVersion && row.dataVersion !== release.version || row.sourceSnapshot !== release.sourceSnapshot);
  if (mismatched) errors.push("모든 데이터 행의 버전과 검증일은 릴리스 정보와 일치해야 합니다.");
  const memberships = setRows.length && echoRows.length ? await db.select().from(echoSetEchoes).where(and(inArray(echoSetEchoes.echoSetId, setRows.map((row) => row.id)), inArray(echoSetEchoes.echoId, echoRows.map((row) => row.id)))) : [];
  if (!memberships.length) errors.push("에코 세트 구성 데이터가 필요합니다.");
  const linkedEchoIds = new Set(memberships.map((membership) => membership.echoId));
  const linkedSetIds = new Set(memberships.map((membership) => membership.echoSetId));
  if (echoRows.some((echo) => !linkedEchoIds.has(echo.id))) errors.push("모든 에코는 같은 릴리스의 에코 세트에 하나 이상 소속되어야 합니다.");
  if (setRows.some((set) => !linkedSetIds.has(set.id))) errors.push("모든 에코 세트에는 하나 이상의 에코 구성이 필요합니다.");
  const requiredCosts = [1, 3, 4];
  if (requiredCosts.some((cost) => !mainStatRows.some((stat) => stat.cost === cost))) errors.push("1·3·4 코스트별 에코 주옵션이 하나 이상 필요합니다.");
  const weaponTypes = new Set(weaponRows.map((weapon) => weapon.weaponType));
  if (characterRows.some((character) => !isRecord(character.baseStats) || typeof character.baseStats.weaponType !== "string" || !weaponTypes.has(character.baseStats.weaponType))) errors.push("모든 캐릭터 무기 타입에 맞는 무기가 하나 이상 필요합니다.");
  return { errors, release };
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  const [gameRows, releases] = await Promise.all([db.query.games.findMany(), db.query.gameDataReleases.findMany()]);
  return NextResponse.json({ games: gameRows, releases });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = releaseActionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "릴리스 입력값을 확인해 주세요.", details: parsed.error.issues }, { status: 400 });
  const db = getDb();

  if (parsed.data.action === "validate") return NextResponse.json(await validateRelease(parsed.data.releaseId));
  if (parsed.data.action === "diff") {
    const result = await getReleaseDiff(parsed.data.releaseId);
    return "error" in result ? NextResponse.json(result, { status: 404 }) : NextResponse.json(result);
  }
  if (parsed.data.action === "publish") {
    const validation = await validateRelease(parsed.data.releaseId);
    if (!validation.release || validation.errors.length) return NextResponse.json({ error: "발행 검증을 통과하지 못했습니다.", errors: validation.errors }, { status: 400 });
    if (validation.release.status !== "draft") return NextResponse.json({ error: "초안 릴리스만 발행할 수 있습니다." }, { status: 400 });
    try {
      await db.transaction(async (tx) => {
        await tx.update(gameDataReleases).set({ status: "superseded" }).where(and(eq(gameDataReleases.gameId, validation.release!.gameId), eq(gameDataReleases.status, "published")));
        const [published] = await tx.update(gameDataReleases).set({ status: "published", publishedAt: new Date() }).where(and(eq(gameDataReleases.id, validation.release!.id), eq(gameDataReleases.status, "draft"))).returning({ id: gameDataReleases.id });
        if (!published) throw new Error("릴리스 상태가 변경되어 발행할 수 없습니다.");
        await tx.update(games).set({ currentDataReleaseId: validation.release!.id, currentDataVersion: validation.release!.version, sourceSnapshot: validation.release!.sourceSnapshot, updatedAt: new Date() }).where(eq(games.id, validation.release!.gameId));
        const [smokeGame] = await tx.select({ currentDataReleaseId: games.currentDataReleaseId }).from(games).where(eq(games.id, validation.release!.gameId));
        const [smokeRelease] = await tx.select({ status: gameDataReleases.status }).from(gameDataReleases).where(eq(gameDataReleases.id, validation.release!.id));
        if (smokeGame?.currentDataReleaseId !== validation.release!.id || smokeRelease?.status !== "published") throw new Error("발행 후 공개 릴리스 스모크 검증에 실패했습니다.");
      });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "다른 발행 작업과 충돌했습니다. 다시 시도해 주세요." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, smoke: { passed: true, releaseId: validation.release.id } });
  }

  const game = await db.query.games.findFirst({ where: eq(games.slug, parsed.data.gameSlug) });
  if (!game?.currentDataReleaseId) return NextResponse.json({ error: "복제할 공개 릴리스를 찾을 수 없습니다." }, { status: 400 });
  const source = await db.query.gameDataReleases.findFirst({ where: eq(gameDataReleases.id, game.currentDataReleaseId) });
  if (!source) return NextResponse.json({ error: "복제할 공개 릴리스를 찾을 수 없습니다." }, { status: 400 });

  const [characterRows, weaponRows, echoRows, setRows, mainStatRows, partyBuffRows] = await Promise.all([
    db.query.characters.findMany({ where: eq(characters.releaseId, source.id) }), db.query.weapons.findMany({ where: eq(weapons.releaseId, source.id) }),
    db.query.echoes.findMany({ where: eq(echoes.releaseId, source.id) }), db.query.echoSets.findMany({ where: eq(echoSets.releaseId, source.id) }), db.query.echoMainStats.findMany({ where: eq(echoMainStats.releaseId, source.id) }), db.query.partyBuffs.findMany({ where: eq(partyBuffs.releaseId, source.id) }),
  ]);
  const memberships = await db.select().from(echoSetEchoes).where(and(inArray(echoSetEchoes.echoSetId, setRows.map((row) => row.id)), inArray(echoSetEchoes.echoId, echoRows.map((row) => row.id))));
  const [draft] = await db.insert(gameDataReleases).values({ gameId: game.id, version: parsed.data.version, status: "draft", sourceSnapshot: parsed.data.sourceSnapshot, sourceManifest: parsed.data.sourceManifest, notes: parsed.data.notes }).returning();
  await Promise.all([
    db.insert(characters).values(characterRows.map((row) => ({ gameId: row.gameId, releaseId: draft.id, externalKey: row.externalKey, name: row.name, role: row.role, baseStats: row.baseStats, dataVersion: draft.version, sourceSnapshot: draft.sourceSnapshot, sourceUrl: row.sourceUrl }))),
    db.insert(weapons).values(weaponRows.map((row) => ({ gameId: row.gameId, releaseId: draft.id, externalKey: row.externalKey, name: row.name, weaponType: row.weaponType, stats: row.stats, dataVersion: draft.version, sourceSnapshot: draft.sourceSnapshot, sourceUrl: row.sourceUrl }))),
    db.insert(echoes).values(echoRows.map((row) => ({ gameId: row.gameId, releaseId: draft.id, externalKey: row.externalKey, name: row.name, cost: row.cost, stats: row.stats, dataVersion: draft.version, sourceSnapshot: draft.sourceSnapshot, sourceUrl: row.sourceUrl }))),
    db.insert(echoMainStats).values(mainStatRows.map((row) => ({ gameId: row.gameId, releaseId: draft.id, cost: row.cost, statKey: row.statKey, value: row.value, dataVersion: draft.version, sourceSnapshot: draft.sourceSnapshot, sourceUrl: row.sourceUrl }))),
    partyBuffRows.length ? db.insert(partyBuffs).values(partyBuffRows.map((row) => ({ releaseId: draft.id, targetCharacterKey: row.targetCharacterKey, providerCharacterKey: row.providerCharacterKey, externalKey: row.externalKey, label: row.label, condition: row.condition, stats: row.stats }))) : Promise.resolve(),
  ]);
  const newSets = await db.insert(echoSets).values(setRows.map((row) => ({ gameId: row.gameId, releaseId: draft.id, externalKey: row.externalKey, name: row.name, effects: row.effects, dataVersion: draft.version, sourceSnapshot: draft.sourceSnapshot, sourceUrl: row.sourceUrl }))).returning({ id: echoSets.id, externalKey: echoSets.externalKey });
  const newEchoes = await db.query.echoes.findMany({ where: eq(echoes.releaseId, draft.id), columns: { id: true, externalKey: true } });
  const oldSetById = new Map(setRows.map((row) => [row.id, row.externalKey]));
  const oldEchoById = new Map(echoRows.map((row) => [row.id, row.externalKey]));
  const newSetByKey = new Map(newSets.map((row) => [row.externalKey, row.id]));
  const newEchoByKey = new Map(newEchoes.map((row) => [row.externalKey, row.id]));
  const clonedMemberships = memberships.flatMap((row) => {
    const echoSetId = newSetByKey.get(oldSetById.get(row.echoSetId) ?? "");
    const echoId = newEchoByKey.get(oldEchoById.get(row.echoId) ?? "");
    return echoSetId && echoId ? [{ echoSetId, echoId }] : [];
  });
  if (clonedMemberships.length) await db.insert(echoSetEchoes).values(clonedMemberships);
  return NextResponse.json({ draft }, { status: 201 });
}
