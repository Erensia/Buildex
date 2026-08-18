import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db/client";
import { cloneReleaseFromPublished, getReleaseDiff, publishRelease, validateRelease } from "@/lib/game-data/release-management";
import { releaseActionSchema } from "@/lib/validation/game-data";

async function requireAdmin() {
  return (await getCurrentAdmin()) ? null : NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
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

  if (parsed.data.action === "validate") return NextResponse.json(await validateRelease(parsed.data.releaseId));

  if (parsed.data.action === "diff") {
    const result = await getReleaseDiff(parsed.data.releaseId);
    return "error" in result ? NextResponse.json(result, { status: 404 }) : NextResponse.json(result);
  }

  if (parsed.data.action === "publish") {
    const result = await publishRelease(parsed.data.releaseId);
    return NextResponse.json(result.body, { status: result.status });
  }

  const result = await cloneReleaseFromPublished(parsed.data.gameSlug, { version: parsed.data.version, sourceSnapshot: parsed.data.sourceSnapshot, sourceManifest: parsed.data.sourceManifest, notes: parsed.data.notes });
  return "error" in result ? NextResponse.json(result, { status: 400 }) : NextResponse.json({ draft: result.draft }, { status: 201 });
}
