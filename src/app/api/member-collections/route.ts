import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/build-profiles";
import { getDb } from "@/lib/db/client";
import { buildFavorites, buildProfiles, partyProfiles } from "@/lib/db/schema";

export async function GET() {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = getDb();
  const [favorites, parties] = await Promise.all([db.query.buildFavorites.findMany({ where: eq(buildFavorites.userId, user.id) }), db.query.partyProfiles.findMany({ where: eq(partyProfiles.userId, user.id) })]);
  return NextResponse.json({ favoriteBuildIds: favorites.map((favorite) => favorite.buildProfileId), parties });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: string; buildId?: string; name?: string; memberBuildIds?: string[] } | null;
  if (!body) return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 }); const db = getDb();
  if (body.action === "toggleFavorite" && body.buildId) { const profile = await db.query.buildProfiles.findFirst({ where: and(eq(buildProfiles.id, body.buildId), eq(buildProfiles.userId, user.id)) }); if (!profile) return NextResponse.json({ error: "빌드를 찾을 수 없습니다." }, { status: 404 }); const existing = await db.query.buildFavorites.findFirst({ where: and(eq(buildFavorites.userId, user.id), eq(buildFavorites.buildProfileId, body.buildId)) }); if (existing) await db.delete(buildFavorites).where(and(eq(buildFavorites.userId, user.id), eq(buildFavorites.buildProfileId, body.buildId))); else await db.insert(buildFavorites).values({ userId: user.id, buildProfileId: body.buildId }); return NextResponse.json({ favorite: !existing }); }
  if (body.action === "createParty" && body.name?.trim() && Array.isArray(body.memberBuildIds) && body.memberBuildIds.length === 3) { const ids = body.memberBuildIds.filter(Boolean); const owned = ids.length ? await db.query.buildProfiles.findMany({ where: and(eq(buildProfiles.userId, user.id), inArray(buildProfiles.id, ids)), columns: { id: true } }) : []; if (owned.length !== ids.length) return NextResponse.json({ error: "파티 빌드는 모두 본인이 저장한 빌드여야 합니다." }, { status: 400 }); const [party] = await db.insert(partyProfiles).values({ userId: user.id, name: body.name.trim(), memberBuildIds: body.memberBuildIds }).returning(); return NextResponse.json(party, { status: 201 }); }
  return NextResponse.json({ error: "지원하지 않는 요청입니다." }, { status: 400 });
}
