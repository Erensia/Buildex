import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/build-profiles";
import { getDb } from "@/lib/db/client";
import { echoSetEchoes } from "@/lib/db/schema";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const db = getDb();
  const [games, characters, weapons, echoes, echoSets, mainStats, echoSetMemberships] = await Promise.all([
    db.query.games.findMany({ columns: { name: true, currentDataVersion: true, sourceSnapshot: true, sourceUrl: true } }),
    db.query.characters.findMany(),
    db.query.weapons.findMany(),
    db.query.echoes.findMany(),
    db.query.echoSets.findMany(),
    db.query.echoMainStats.findMany(),
    db.select().from(echoSetEchoes),
  ]);

  return NextResponse.json({ games, characters, weapons, echoes, echoSets, mainStats, echoSetMemberships });
}
