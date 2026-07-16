import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db/client";
import { characters, echoMainStats, echoes, echoSetEchoes, echoSets, games, weapons } from "@/lib/db/schema";
import { deleteGameDataSchema, gameDataSchema, type GameDataInput } from "@/lib/validation/game-data";

async function requireAdmin() {
  const admin = await getCurrentAdmin();
  return admin ? null : NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
}

async function findGame(slug: string) {
  return getDb().query.games.findFirst({ where: eq(games.slug, slug) });
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getDb();
  const [gameRows, characterRows, weaponRows, echoRows, echoSetRows, mainStatRows, memberships] = await Promise.all([
    db.query.games.findMany(), db.query.characters.findMany(), db.query.weapons.findMany(), db.query.echoes.findMany(),
    db.query.echoSets.findMany(), db.query.echoMainStats.findMany(), db.select().from(echoSetEchoes),
  ]);
  return NextResponse.json({ games: gameRows, characters: characterRows, weapons: weaponRows, echoes: echoRows, echoSets: echoSetRows, mainStats: mainStatRows, memberships });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = gameDataSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "입력값을 확인해 주세요.", details: parsed.error.issues }, { status: 400 });

  const input = parsed.data;
  const db = getDb();
  if (input.entity === "game") {
    await db.insert(games).values({ slug: input.slug, name: input.name, currentDataVersion: input.dataVersion, sourceSnapshot: input.sourceSnapshot, sourceUrl: input.sourceUrl, isActive: input.isActive })
      .onConflictDoUpdate({ target: games.slug, set: { name: input.name, currentDataVersion: input.dataVersion, sourceSnapshot: input.sourceSnapshot, sourceUrl: input.sourceUrl, isActive: input.isActive, updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  const game = await findGame(input.gameSlug);
  if (!game) return NextResponse.json({ error: "먼저 해당 게임을 등록해 주세요." }, { status: 400 });
  try {
    await upsertGameData(input, game.id);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "게임 데이터를 저장하지 못했습니다." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

async function upsertGameData(input: Exclude<GameDataInput, { entity: "game" }>, gameId: string) {
  const db = getDb();
  if (input.entity === "character") {
    await db.insert(characters).values({ gameId, externalKey: input.externalKey, name: input.name, role: input.role, baseStats: input.baseStats, dataVersion: input.dataVersion, sourceSnapshot: input.sourceSnapshot, sourceUrl: input.sourceUrl })
      .onConflictDoUpdate({ target: [characters.gameId, characters.externalKey], set: { name: input.name, role: input.role, baseStats: input.baseStats, dataVersion: input.dataVersion, sourceSnapshot: input.sourceSnapshot, sourceUrl: input.sourceUrl } });
  } else if (input.entity === "weapon") {
    await db.insert(weapons).values({ gameId, externalKey: input.externalKey, name: input.name, weaponType: input.weaponType, stats: input.stats, dataVersion: input.dataVersion, sourceSnapshot: input.sourceSnapshot, sourceUrl: input.sourceUrl })
      .onConflictDoUpdate({ target: [weapons.gameId, weapons.externalKey], set: { name: input.name, weaponType: input.weaponType, stats: input.stats, dataVersion: input.dataVersion, sourceSnapshot: input.sourceSnapshot, sourceUrl: input.sourceUrl } });
  } else if (input.entity === "echo") {
    await db.insert(echoes).values({ gameId, externalKey: input.externalKey, name: input.name, cost: input.cost, stats: input.stats, dataVersion: input.dataVersion, sourceSnapshot: input.sourceSnapshot, sourceUrl: input.sourceUrl })
      .onConflictDoUpdate({ target: [echoes.gameId, echoes.externalKey], set: { name: input.name, cost: input.cost, stats: input.stats, dataVersion: input.dataVersion, sourceSnapshot: input.sourceSnapshot, sourceUrl: input.sourceUrl } });
  } else if (input.entity === "echoSet") {
    await db.insert(echoSets).values({ gameId, externalKey: input.externalKey, name: input.name, effects: input.effects, dataVersion: input.dataVersion, sourceSnapshot: input.sourceSnapshot, sourceUrl: input.sourceUrl })
      .onConflictDoUpdate({ target: [echoSets.gameId, echoSets.externalKey], set: { name: input.name, effects: input.effects, dataVersion: input.dataVersion, sourceSnapshot: input.sourceSnapshot, sourceUrl: input.sourceUrl } });
  } else if (input.entity === "mainStat") {
    await db.insert(echoMainStats).values({ gameId, cost: input.cost, statKey: input.statKey, value: input.value, dataVersion: input.dataVersion, sourceSnapshot: input.sourceSnapshot, sourceUrl: input.sourceUrl })
      .onConflictDoUpdate({ target: [echoMainStats.gameId, echoMainStats.cost, echoMainStats.statKey], set: { value: input.value, dataVersion: input.dataVersion, sourceSnapshot: input.sourceSnapshot, sourceUrl: input.sourceUrl } });
  } else {
    const [echoSet, echo] = await Promise.all([
      db.query.echoSets.findFirst({ where: and(eq(echoSets.gameId, gameId), eq(echoSets.externalKey, input.echoSetKey)) }),
      db.query.echoes.findFirst({ where: and(eq(echoes.gameId, gameId), eq(echoes.externalKey, input.echoKey)) }),
    ]);
    if (!echoSet || !echo) throw new Error("에코 세트와 에코를 먼저 등록해 주세요.");
    await db.insert(echoSetEchoes).values({ echoSetId: echoSet.id, echoId: echo.id }).onConflictDoNothing();
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = deleteGameDataSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "삭제 대상을 확인해 주세요." }, { status: 400 });
  const input = parsed.data;
  const db = getDb();
  if (input.entity === "game") {
    await db.delete(games).where(eq(games.slug, input.slug));
    return NextResponse.json({ ok: true });
  }
  const game = await findGame(input.gameSlug);
  if (!game) return NextResponse.json({ error: "게임을 찾을 수 없습니다." }, { status: 404 });
  if (input.entity === "character") await db.delete(characters).where(and(eq(characters.gameId, game.id), eq(characters.externalKey, input.externalKey)));
  else if (input.entity === "weapon") await db.delete(weapons).where(and(eq(weapons.gameId, game.id), eq(weapons.externalKey, input.externalKey)));
  else if (input.entity === "echo") await db.delete(echoes).where(and(eq(echoes.gameId, game.id), eq(echoes.externalKey, input.externalKey)));
  else if (input.entity === "echoSet") await db.delete(echoSets).where(and(eq(echoSets.gameId, game.id), eq(echoSets.externalKey, input.externalKey)));
  else if (input.entity === "mainStat") await db.delete(echoMainStats).where(and(eq(echoMainStats.gameId, game.id), eq(echoMainStats.cost, input.cost), eq(echoMainStats.statKey, input.statKey)));
  else if (input.entity === "echoSetMembership") {
    const [echoSet, echo] = await Promise.all([
      db.query.echoSets.findFirst({ where: and(eq(echoSets.gameId, game.id), eq(echoSets.externalKey, input.echoSetKey)) }),
      db.query.echoes.findFirst({ where: and(eq(echoes.gameId, game.id), eq(echoes.externalKey, input.echoKey)) }),
    ]);
    if (echoSet && echo) await db.delete(echoSetEchoes).where(and(eq(echoSetEchoes.echoSetId, echoSet.id), eq(echoSetEchoes.echoId, echo.id)));
  }
  return NextResponse.json({ ok: true });
}
