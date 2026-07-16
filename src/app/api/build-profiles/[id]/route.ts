import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedBuildProfile } from "@/lib/build-profiles";
import { getDb } from "@/lib/db/client";
import { buildProfiles } from "@/lib/db/schema";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const profile = await getOwnedBuildProfile(id, user.id);
  if (!profile) return NextResponse.json({ error: "저장된 빌드를 찾을 수 없습니다." }, { status: 404 });
  await getDb().delete(buildProfiles).where(eq(buildProfiles.id, profile.id));
  return new NextResponse(null, { status: 204 });
}
