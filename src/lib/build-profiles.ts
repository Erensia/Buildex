import { and, desc, eq, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { buildProfiles, characters, echoes, echoSetEchoes, echoSets, echoMainStats, users, weapons } from "@/lib/db/schema";
import { getPublicRelease } from "@/lib/game-data-releases";
import type { BuildInput } from "@/lib/validation/build";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;

  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) return null;

  // The configured bootstrap address is the only account automatically promoted.
  // All other role changes must be made directly in the database by an administrator.
  const bootstrapEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (bootstrapEmail && user.email === bootstrapEmail && user.role !== "admin") {
    const [admin] = await db.update(users).set({ role: "admin", updatedAt: new Date() }).where(eq(users.id, user.id)).returning();
    return admin;
  }
  return user;
}

export async function getBuildProfilesForUser(userId: string) {
  return getDb().query.buildProfiles.findMany({
    where: eq(buildProfiles.userId, userId),
    orderBy: [desc(buildProfiles.updatedAt)],
  });
}

export async function getBuildReferences(characterKey: string, weaponKey: string, setKeys: string[] = [], echoKeys: string[] = [], releaseId?: string | null) {
  const db = getDb();
  const current = await getPublicRelease(releaseId ?? undefined);
  if (!current) return { release: null, character: undefined, weapon: undefined, sets: [], selectedEchoes: [], memberships: [], mainStats: [] };
  const targetReleaseId = current.release.id;
  const character = await db.query.characters.findFirst({ where: and(eq(characters.releaseId, targetReleaseId), eq(characters.externalKey, characterKey)) });
  const weapon = await db.query.weapons.findFirst({ where: and(eq(weapons.releaseId, targetReleaseId), eq(weapons.externalKey, weaponKey)) });
  const sets = setKeys.length ? await db.query.echoSets.findMany({ where: and(eq(echoSets.releaseId, targetReleaseId), inArray(echoSets.externalKey, setKeys)) }) : [];
  const selectedEchoes = echoKeys.length ? await db.query.echoes.findMany({ where: and(eq(echoes.releaseId, targetReleaseId), inArray(echoes.externalKey, echoKeys)) }) : [];
  const memberships = selectedEchoes.length && sets.length
    ? await db.select().from(echoSetEchoes).where(and(inArray(echoSetEchoes.echoId, selectedEchoes.map((echo) => echo.id)), inArray(echoSetEchoes.echoSetId, sets.map((set) => set.id))))
    : [];
  const mainStats = await db.query.echoMainStats.findMany({ where: eq(echoMainStats.releaseId, targetReleaseId) });
  return { release: current.release, character, weapon, sets, selectedEchoes, memberships, mainStats };
}

export function validateBuildReferences(input: BuildInput, references: Awaited<ReturnType<typeof getBuildReferences>>) {
  const { character, weapon, sets, selectedEchoes, memberships, mainStats } = references;
  if (!character || !weapon) return "Selected character or weapon was not found.";
  const weaponType = (character.baseStats as { weaponType?: string }).weaponType;
  if (weaponType && weapon.weaponType !== weaponType) return "The selected weapon is not compatible with this character.";
  if (sets.length !== new Set(input.echoes.map((echo) => echo.setKey)).size) return "One or more selected echo sets were not found.";
  if (selectedEchoes.length !== new Set(input.echoes.map((echo) => echo.echoKey)).size) return "One or more selected echoes were not found.";
  for (const echo of input.echoes) {
    const selectedEcho = selectedEchoes.find((item) => item.externalKey === echo.echoKey);
    const set = sets.find((item) => item.externalKey === echo.setKey);
    if (!selectedEcho || !set || selectedEcho.cost !== echo.cost) return "An echo does not match its selected slot cost.";
    if (!memberships.some((membership) => membership.echoId === selectedEcho.id && membership.echoSetId === set.id)) return "The selected echo does not belong to its selected set.";
    if (!mainStats.some((stat) => stat.cost === echo.cost && stat.statKey === echo.mainStat)) return "The selected main stat is not valid for this echo slot.";
  }
  return null;
}

export async function getOwnedBuildProfile(id: string, userId: string) {
  return getDb().query.buildProfiles.findFirst({
    where: and(eq(buildProfiles.id, id), eq(buildProfiles.userId, userId)),
  });
}
