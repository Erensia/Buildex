import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/build-profiles";
import { getDb } from "@/lib/db/client";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const db = getDb();
  const [characters, weapons, echoes, echoSets, mainStats] = await Promise.all([
    db.query.characters.findMany(),
    db.query.weapons.findMany(),
    db.query.echoes.findMany(),
    db.query.echoSets.findMany(),
    db.query.echoMainStats.findMany(),
  ]);

  return NextResponse.json({ characters, weapons, echoes, echoSets, mainStats });
}
