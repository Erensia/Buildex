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
