import { and, desc, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { buildProfiles, characters, users, weapons } from "@/lib/db/schema";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;

  return getDb().query.users.findFirst({ where: eq(users.email, email) });
}

export async function getBuildProfilesForUser(userId: string) {
  return getDb().query.buildProfiles.findMany({
    where: eq(buildProfiles.userId, userId),
    orderBy: [desc(buildProfiles.updatedAt)],
  });
}

export async function getBuildReferences(characterKey: string, weaponKey: string) {
  const db = getDb();
  const character = await db.query.characters.findFirst({ where: eq(characters.externalKey, characterKey) });
  const weapon = await db.query.weapons.findFirst({ where: eq(weapons.externalKey, weaponKey) });
  return { character, weapon };
}

export async function getOwnedBuildProfile(id: string, userId: string) {
  return getDb().query.buildProfiles.findFirst({
    where: and(eq(buildProfiles.id, id), eq(buildProfiles.userId, userId)),
  });
}
