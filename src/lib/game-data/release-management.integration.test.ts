// Integration test — needs a real Postgres database (TEST_DATABASE_URL).
// Run `pnpm test:integration:setup` once, then `pnpm test:integration`.
//
// Covers the functions extracted out of the admin releases route handler
// (src/app/api/admin/game-data/releases/route.ts) so they're exercised
// directly against real release data instead of only through HTTP.
import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/client";
import { characters, echoMainStats, echoSets, echoes, gameDataReleases, games, partyBuffs, weapons } from "@/lib/db/schema";
import { getCurrentPublishedRelease } from "@/lib/game-data-releases";
import { cloneReleaseFromPublished, getReleaseDiff, publishRelease, validateRelease } from "@/lib/game-data/release-management";

const GAME_SLUG = "wuthering-waves";

/** Deletes a release's rows. Child echo-set/echo memberships cascade automatically. */
async function deleteReleaseAndChildren(releaseId: string) {
  const db = getDb();
  await Promise.all([
    db.delete(characters).where(eq(characters.releaseId, releaseId)),
    db.delete(weapons).where(eq(weapons.releaseId, releaseId)),
    db.delete(echoes).where(eq(echoes.releaseId, releaseId)),
    db.delete(echoSets).where(eq(echoSets.releaseId, releaseId)),
    db.delete(echoMainStats).where(eq(echoMainStats.releaseId, releaseId)),
    db.delete(partyBuffs).where(eq(partyBuffs.releaseId, releaseId)),
  ]);
  await db.delete(gameDataReleases).where(eq(gameDataReleases.id, releaseId));
}

describe("release-management (DB-backed admin release logic)", () => {
  let publishedReleaseId: string;
  const createdDraftIds: string[] = [];

  beforeAll(async () => {
    const published = await getCurrentPublishedRelease();
    if (!published) throw new Error("No published game data release found. Run `pnpm test:integration:setup` before `pnpm test:integration`.");
    publishedReleaseId = published.release.id;
  });

  afterEach(async () => {
    // Best-effort cleanup so repeated local runs don't accumulate test drafts.
    while (createdDraftIds.length) {
      const id = createdDraftIds.pop()!;
      const row = await getDb().query.gameDataReleases.findFirst({ where: eq(gameDataReleases.id, id) });
      if (row) await deleteReleaseAndChildren(id);
    }
  });

  describe("validateRelease", () => {
    it("finds no errors for the currently published release", async () => {
      const result = await validateRelease(publishedReleaseId);
      expect(result.errors).toEqual([]);
      expect(result.release?.id).toBe(publishedReleaseId);
    });

    it("reports an unknown release id instead of throwing", async () => {
      const result = await validateRelease("00000000-0000-4000-8000-000000000000");
      expect(result.release).toBeNull();
      expect(result.errors).toContain("릴리스를 찾을 수 없습니다.");
    });
  });

  describe("getReleaseDiff", () => {
    it("reports no changes when the compared release is the currently published one", async () => {
      const result = await getReleaseDiff(publishedReleaseId);
      if ("error" in result) throw new Error(`expected a diff, got error: ${result.error}`);
      for (const changes of Object.values(result.diff)) {
        expect(changes.added).toEqual([]);
        expect(changes.changed).toEqual([]);
        expect(changes.removed).toEqual([]);
      }
    });

    it("reports an error for an unknown release id", async () => {
      const result = await getReleaseDiff("00000000-0000-4000-8000-000000000000");
      expect(result).toEqual({ error: "릴리스를 찾을 수 없습니다." });
    });
  });

  describe("cloneReleaseFromPublished", () => {
    it("clones every published row into a new draft release", async () => {
      const [sourceCharacters, sourceWeapons] = await Promise.all([
        getDb().query.characters.findMany({ where: eq(characters.releaseId, publishedReleaseId) }),
        getDb().query.weapons.findMany({ where: eq(weapons.releaseId, publishedReleaseId) }),
      ]);

      const result = await cloneReleaseFromPublished(GAME_SLUG, {
        version: `it-clone-${Date.now()}`,
        sourceSnapshot: "2026-08-18",
        sourceManifest: [{ label: "Integration test", url: "https://example.com/integration-test" }],
        notes: "Created by release-management.integration.test.ts; deleted in afterEach.",
      });
      if ("error" in result) throw new Error(`expected a draft, got error: ${result.error}`);
      createdDraftIds.push(result.draft.id);

      expect(result.draft.status).toBe("draft");
      const [clonedCharacters, clonedWeapons] = await Promise.all([
        getDb().query.characters.findMany({ where: eq(characters.releaseId, result.draft.id) }),
        getDb().query.weapons.findMany({ where: eq(weapons.releaseId, result.draft.id) }),
      ]);
      expect(clonedCharacters).toHaveLength(sourceCharacters.length);
      expect(clonedWeapons).toHaveLength(sourceWeapons.length);
    });

    it("reports an error for an unknown game slug", async () => {
      const result = await cloneReleaseFromPublished("no-such-game", { version: "x", sourceSnapshot: "2026-08-18", sourceManifest: [] });
      expect(result).toEqual({ error: "복제할 공개 릴리스를 찾을 수 없습니다." });
    });
  });

  describe("publishRelease", () => {
    it("rejects an unknown release id with a 400", async () => {
      const result = await publishRelease("00000000-0000-4000-8000-000000000000");
      expect(result.status).toBe(400);
      expect(result.body.error).toBe("발행 검증을 통과하지 못했습니다.");
    });

    it("rejects a release that is not a draft, without mutating anything", async () => {
      // The currently published release is a real, non-draft row; this path
      // returns before any write, so it's safe to exercise directly.
      const result = await publishRelease(publishedReleaseId);
      expect(result.status).toBe(400);
      expect(result.body.error).toBe("초안 릴리스만 발행할 수 있습니다.");

      const stillPublished = await getCurrentPublishedRelease();
      expect(stillPublished?.release.id).toBe(publishedReleaseId);
    });

    it("publishes a cloned draft and passes the public-API smoke test, then restores the original release", async () => {
      const originalGame = await getDb().query.games.findFirst({ where: eq(games.slug, GAME_SLUG) });
      const originalRelease = await getDb().query.gameDataReleases.findFirst({ where: eq(gameDataReleases.id, publishedReleaseId) });
      if (!originalGame || !originalRelease) throw new Error("Expected the published game/release to exist.");

      const cloneResult = await cloneReleaseFromPublished(GAME_SLUG, {
        version: `it-publish-${Date.now()}`,
        sourceSnapshot: originalRelease.sourceSnapshot,
        sourceManifest: originalRelease.sourceManifest,
        notes: "Created by release-management.integration.test.ts; state restored after this test.",
      });
      if ("error" in cloneResult) throw new Error(`expected a draft, got error: ${cloneResult.error}`);
      const draft = cloneResult.draft;

      try {
        const result = await publishRelease(draft.id);
        expect(result.status).toBe(200);
        expect(result.body.ok).toBe(true);
        const smoke = result.body.smoke as { passed: boolean; releaseId: string };
        expect(smoke.passed, `expected the post-commit public smoke test to pass: ${JSON.stringify(result.body)}`).toBe(true);
        expect(smoke.releaseId).toBe(draft.id);

        const nowPublished = await getCurrentPublishedRelease();
        expect(nowPublished?.release.id).toBe(draft.id);
      } finally {
        // Restore the original public pointer, then delete the temporary
        // clone entirely (rather than leaving it "superseded" forever) so
        // repeated local runs don't accumulate test releases. The draft must
        // stop being "published" *before* the original is set back to
        // "published" -- the DB only allows one published row per game.
        await getDb().update(gameDataReleases).set({ status: "superseded" }).where(eq(gameDataReleases.id, draft.id));
        await getDb().update(gameDataReleases).set({ status: "published", publishedAt: originalRelease.publishedAt }).where(eq(gameDataReleases.id, originalRelease.id));
        await getDb().update(games).set({ currentDataReleaseId: originalGame.currentDataReleaseId, currentDataVersion: originalGame.currentDataVersion, sourceSnapshot: originalGame.sourceSnapshot }).where(eq(games.id, originalGame.id));
        await deleteReleaseAndChildren(draft.id);

        const restored = await getCurrentPublishedRelease();
        expect(restored?.release.id).toBe(publishedReleaseId);
      }
    });
  });
});
