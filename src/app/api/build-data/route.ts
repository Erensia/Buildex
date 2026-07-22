import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/build-profiles";
import { getDb } from "@/lib/db/client";
import { echoSetEchoes, echoMainStats, echoes as echoesTable, echoSets as echoSetsTable, characters as charactersTable, partyBuffs, weapons as weaponsTable } from "@/lib/db/schema";
import { getPublicRelease } from "@/lib/game-data-releases";
import { eq, inArray } from "drizzle-orm";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const db = getDb();
  const releaseIdParam = new URL(request.url).searchParams.get("releaseId") ?? undefined;
  const current = await getPublicRelease(releaseIdParam);
  if (!current) return NextResponse.json({ error: "공개된 게임 데이터가 없습니다." }, { status: 503 });
  const releaseId = current.release.id;
  const [games, characters, weapons, echoes, echoSets, mainStats, partyBuffDefinitions, echoSetMemberships] = await Promise.all([
    Promise.resolve([{ name: current.game.name, currentDataVersion: current.release.version, sourceSnapshot: current.release.sourceSnapshot, sourceUrl: current.game.sourceUrl, releaseId }]),
    db.query.characters.findMany({ where: eq(charactersTable.releaseId, releaseId) }),
    db.query.weapons.findMany({ where: eq(weaponsTable.releaseId, releaseId) }),
    db.query.echoes.findMany({ where: eq(echoesTable.releaseId, releaseId) }),
    db.query.echoSets.findMany({ where: eq(echoSetsTable.releaseId, releaseId) }),
    db.query.echoMainStats.findMany({ where: eq(echoMainStats.releaseId, releaseId) }),
    db.query.partyBuffs.findMany({ where: eq(partyBuffs.releaseId, releaseId) }),
    db.select().from(echoSetEchoes).where(inArray(echoSetEchoes.echoSetId, (await db.query.echoSets.findMany({ where: eq(echoSetsTable.releaseId, releaseId), columns: { id: true } })).map((set) => set.id))),
  ]);

  return NextResponse.json({ games, characters, weapons, echoes, echoSets, mainStats, partyBuffs: partyBuffDefinitions, echoSetMemberships });
}
