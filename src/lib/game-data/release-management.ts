// Domain logic for the admin game-data release workflow (validate, diff,
// publish, clone-as-draft). Extracted out of the route handler so it reads
// the same way as src/lib/build-profiles.ts and src/lib/game-data-releases.ts:
// route.ts files stay thin and only translate these results into HTTP
// responses. This also makes the logic directly unit/integration-testable
// without going through a Request/Response.
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { characters, echoMainStats, echoes, echoSetEchoes, echoSets, gameDataReleases, games, partyBuffs, weapons } from "@/lib/db/schema";
import { SUPPORTED_STAT_KEYS } from "@/lib/formula/stats";
import { getCurrentPublishedRelease } from "@/lib/game-data-releases";
import { diffReleaseRows } from "@/lib/game-data/release-diff";

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

export async function getReleaseDiff(releaseId: string) {
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

export async function validateRelease(releaseId: string) {
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

export type PublishResult = { status: number; body: Record<string, unknown> };

/**
 * Validates, publishes, and smoke-tests a draft release. The transaction only
 * re-reads through the same connection as a pre-commit consistency guard;
 * the real public-API smoke test runs after commit via getCurrentPublishedRelease,
 * the same lookup /characters and /api/build-data use.
 */
export async function publishRelease(releaseId: string): Promise<PublishResult> {
  const db = getDb();
  const validation = await validateRelease(releaseId);
  if (!validation.release || validation.errors.length) return { status: 400, body: { error: "발행 검증을 통과하지 못했습니다.", errors: validation.errors } };
  if (validation.release.status !== "draft") return { status: 400, body: { error: "초안 릴리스만 발행할 수 있습니다." } };

  try {
    await db.transaction(async (tx) => {
      await tx.update(gameDataReleases).set({ status: "superseded" }).where(and(eq(gameDataReleases.gameId, validation.release!.gameId), eq(gameDataReleases.status, "published")));
      const [published] = await tx.update(gameDataReleases).set({ status: "published", publishedAt: new Date() }).where(and(eq(gameDataReleases.id, validation.release!.id), eq(gameDataReleases.status, "draft"))).returning({ id: gameDataReleases.id });
      if (!published) throw new Error("릴리스 상태가 변경되어 발행할 수 없습니다.");
      await tx.update(games).set({ currentDataReleaseId: validation.release!.id, currentDataVersion: validation.release!.version, sourceSnapshot: validation.release!.sourceSnapshot, updatedAt: new Date() }).where(eq(games.id, validation.release!.gameId));
      // Re-read inside the transaction as a same-connection consistency guard before commit.
      const [txGame] = await tx.select({ currentDataReleaseId: games.currentDataReleaseId }).from(games).where(eq(games.id, validation.release!.gameId));
      const [txRelease] = await tx.select({ status: gameDataReleases.status }).from(gameDataReleases).where(eq(gameDataReleases.id, validation.release!.id));
      if (txGame?.currentDataReleaseId !== validation.release!.id || txRelease?.status !== "published") throw new Error("발행 트랜잭션 내부 일관성 검증에 실패했습니다.");
    });
  } catch (error) {
    return { status: 409, body: { error: error instanceof Error ? error.message : "다른 발행 작업과 충돌했습니다. 다시 시도해 주세요." } };
  }

  // Post-commit smoke test: exercise the same lookup the public routes (`/characters`, `/api/build-data`)
  // use, so a bug in that shared query path is caught right after publish instead of by a user report.
  const published = await getCurrentPublishedRelease();
  const smokePassed = published?.release.id === validation.release.id;
  let smokeCounts: { characters: number; weapons: number; echoes: number } | null = null;
  if (smokePassed) {
    const [characterRows, weaponRows, echoRows] = await Promise.all([
      db.query.characters.findMany({ where: eq(characters.releaseId, published.release.id), columns: { id: true } }),
      db.query.weapons.findMany({ where: eq(weapons.releaseId, published.release.id), columns: { id: true } }),
      db.query.echoes.findMany({ where: eq(echoes.releaseId, published.release.id), columns: { id: true } }),
    ]);
    smokeCounts = { characters: characterRows.length, weapons: weaponRows.length, echoes: echoRows.length };
  }
  const smokeOk = smokePassed && !!smokeCounts && smokeCounts.characters > 0 && smokeCounts.weapons > 0 && smokeCounts.echoes > 0;
  if (!smokeOk) {
    return { status: 200, body: { ok: true, smoke: { passed: false, releaseId: validation.release.id }, warning: "릴리스는 발행되었지만 공개 API 스모크 검증에 실패했습니다. 공개 화면 데이터를 즉시 확인해 주세요." } };
  }
  return { status: 200, body: { ok: true, smoke: { passed: true, releaseId: validation.release.id, counts: smokeCounts } } };
}

export type DraftClonePayload = { version: string; sourceSnapshot: string; sourceManifest: unknown; notes?: string };

/** Clones the currently published release's rows into a new `draft` release for the given game. */
export async function cloneReleaseFromPublished(gameSlug: string, payload: DraftClonePayload) {
  const db = getDb();
  const game = await db.query.games.findFirst({ where: eq(games.slug, gameSlug) });
  if (!game?.currentDataReleaseId) return { error: "복제할 공개 릴리스를 찾을 수 없습니다." };
  const source = await db.query.gameDataReleases.findFirst({ where: eq(gameDataReleases.id, game.currentDataReleaseId) });
  if (!source) return { error: "복제할 공개 릴리스를 찾을 수 없습니다." };

  const [characterRows, weaponRows, echoRows, setRows, mainStatRows, partyBuffRows] = await Promise.all([
    db.query.characters.findMany({ where: eq(characters.releaseId, source.id) }), db.query.weapons.findMany({ where: eq(weapons.releaseId, source.id) }),
    db.query.echoes.findMany({ where: eq(echoes.releaseId, source.id) }), db.query.echoSets.findMany({ where: eq(echoSets.releaseId, source.id) }), db.query.echoMainStats.findMany({ where: eq(echoMainStats.releaseId, source.id) }), db.query.partyBuffs.findMany({ where: eq(partyBuffs.releaseId, source.id) }),
  ]);
  const memberships = await db.select().from(echoSetEchoes).where(and(inArray(echoSetEchoes.echoSetId, setRows.map((row) => row.id)), inArray(echoSetEchoes.echoId, echoRows.map((row) => row.id))));
  const [draft] = await db.insert(gameDataReleases).values({ gameId: game.id, version: payload.version, status: "draft", sourceSnapshot: payload.sourceSnapshot, sourceManifest: payload.sourceManifest, notes: payload.notes }).returning();
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
  return { draft };
}
