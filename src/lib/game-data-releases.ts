import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { gameDataReleases, games } from "@/lib/db/schema";

export async function getCurrentPublishedRelease() {
  const game = await getDb().query.games.findFirst({ where: eq(games.isActive, true) });
  if (!game?.currentDataReleaseId) return null;
  const release = await getDb().query.gameDataReleases.findFirst({
    where: and(eq(gameDataReleases.id, game.currentDataReleaseId), eq(gameDataReleases.status, "published")),
  });
  return release ? { game, release } : null;
}

/** Returns an immutable public release. Drafts are deliberately never exposed to planners. */
export async function getPublicRelease(releaseId?: string) {
  if (!releaseId) return getCurrentPublishedRelease();
  const release = await getDb().query.gameDataReleases.findFirst({ where: eq(gameDataReleases.id, releaseId) });
  if (!release || (release.status !== "published" && release.status !== "superseded")) return null;
  const game = await getDb().query.games.findFirst({ where: and(eq(games.id, release.gameId), eq(games.isActive, true)) });
  return game ? { game, release } : null;
}
