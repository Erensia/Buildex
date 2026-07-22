import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { characters, echoSets, weapons } from "@/lib/db/schema";
import { getCurrentPublishedRelease } from "@/lib/game-data-releases";
import { PublicLibrary } from "@/components/public-library";

export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  const current = await getCurrentPublishedRelease();
  const releaseId = current?.release.id;
  const db = getDb();
  const [characterRows, weaponRows, setRows] = releaseId ? await Promise.all([
    db.query.characters.findMany({ where: eq(characters.releaseId, releaseId) }),
    db.query.weapons.findMany({ where: eq(weapons.releaseId, releaseId) }),
    db.query.echoSets.findMany({ where: eq(echoSets.releaseId, releaseId) }),
  ]) : [[], [], []];
  return <main className="min-h-screen bg-zinc-950 px-5 py-8 text-zinc-100 sm:px-8"><div className="mx-auto max-w-6xl"><header className="flex items-center justify-between"><Link href="/" className="font-black tracking-widest text-violet-300">BUILDEX</Link><Link href="/signin" className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-bold">로그인하고 빌드 만들기</Link></header><section className="mt-12"><p className="text-xs font-bold tracking-[.18em] text-violet-300">PUBLIC LIBRARY</p><h1 className="mt-2 text-4xl font-black">명조 빌드 정보</h1><p className="mt-3 text-sm text-zinc-400">공개 릴리스 v{current?.release.version ?? "—"} · 검증 {current?.release.sourceSnapshot ?? "—"}</p></section><PublicLibrary characters={characterRows.map((row) => ({ id: row.id, name: row.name, role: row.role, weaponType: (row.baseStats as { weaponType?: string }).weaponType }))} weapons={weaponRows.map((row) => ({ id: row.id, name: row.name, weaponType: row.weaponType, stats: row.stats as { baseAttack?: number; critRate?: number; critDamage?: number; energyRegen?: number; attackPercent?: number } }))} echoSetNames={setRows.map((row) => row.name)} /></div></main>;
}
