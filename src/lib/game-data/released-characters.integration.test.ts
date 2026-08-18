// Integration test — needs a real Postgres database (TEST_DATABASE_URL).
// Run `pnpm test:integration:setup` once, then `pnpm test:integration`.
//
// Exercises the same read path the public routes use (`getCurrentPublishedRelease`,
// `getBuildReferences`, `validateBuildReferences`) against the actual published
// 3.5.1 release data, instead of a hand-written fixture. Covers the characters
// added by the "지원 캐릭터 확대" phase (docs/next-phase-plan.md) that previously
// had no automated public-read or build-input coverage.
import { and, eq, inArray } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/client";
import { characters as charactersTable, echoMainStats, echoSetEchoes, echoSets as echoSetsTable, echoes as echoesTable, weapons as weaponsTable } from "@/lib/db/schema";
import { getBuildReferences, validateBuildReferences } from "@/lib/build-profiles";
import { getCurrentPublishedRelease } from "@/lib/game-data-releases";
import { buildInputSchema } from "@/lib/validation/build";

// externalKeys added by the 3.5.1 aero/electro/havoc party expansion
// (drizzle/0015_expand_element_parties.sql).
const EXPANSION_CHARACTER_KEYS = [
  "jiyan", "mortefi", "verina", "iuno", "jianxin", "xiangli-yao", "yinlin",
  "camellya", "roccia", "rover-havoc", "yangyang-xuanling",
];

// Builds one 4-3-3-1-1 slot of minimal, schema-valid echo selections drawn
// from whatever echoes actually exist in the release, so the test tracks
// real data instead of a fixture that can drift from it.
async function buildMinimalEchoSlots(releaseId: string) {
  const db = getDb();
  const membershipRows = await db
    .select({ echoSetKey: echoSetsTable.externalKey, echoKey: echoesTable.externalKey, cost: echoesTable.cost })
    .from(echoSetEchoes)
    .innerJoin(echoesTable, eq(echoSetEchoes.echoId, echoesTable.id))
    .innerJoin(echoSetsTable, eq(echoSetEchoes.echoSetId, echoSetsTable.id))
    .where(and(eq(echoesTable.releaseId, releaseId), eq(echoSetsTable.releaseId, releaseId)));

  const mainStatRows = await db.query.echoMainStats.findMany({ where: eq(echoMainStats.releaseId, releaseId) });
  const mainStatByCost = new Map(mainStatRows.map((row) => [row.cost, row.statKey]));

  const byCost = new Map<number, typeof membershipRows>();
  for (const row of membershipRows) byCost.set(row.cost, [...(byCost.get(row.cost) ?? []), row]);

  const slotPlan: { slot: number; cost: 1 | 3 | 4 }[] = [
    { slot: 1, cost: 4 }, { slot: 2, cost: 3 }, { slot: 3, cost: 3 }, { slot: 4, cost: 1 }, { slot: 5, cost: 1 },
  ];
  return slotPlan.map(({ slot, cost }, index) => {
    const candidates = byCost.get(cost) ?? [];
    if (!candidates.length) throw new Error(`No echoes with cost ${cost} found in release ${releaseId}.`);
    const pick = candidates[index % candidates.length];
    const mainStat = mainStatByCost.get(cost);
    if (!mainStat) throw new Error(`No echo main stat found for cost ${cost} in release ${releaseId}.`);
    return { slot, echoKey: pick.echoKey, setKey: pick.echoSetKey, cost, mainStat, subStats: [] };
  });
}

describe("expansion characters are readable and buildable through the real DB-backed path", () => {
  let releaseId: string;

  beforeAll(async () => {
    const published = await getCurrentPublishedRelease();
    if (!published) throw new Error("No published game data release found. Run `pnpm test:integration:setup` before `pnpm test:integration`.");
    releaseId = published.release.id;
  });

  it("published release exposes at least the expected expansion characters", async () => {
    const rows = await getDb().query.characters.findMany({
      where: and(eq(charactersTable.releaseId, releaseId), inArray(charactersTable.externalKey, EXPANSION_CHARACTER_KEYS)),
      columns: { externalKey: true },
    });
    const found = new Set(rows.map((row) => row.externalKey));
    for (const key of EXPANSION_CHARACTER_KEYS) expect(found.has(key), `expected "${key}" in the published release`).toBe(true);
  });

  it.each(EXPANSION_CHARACTER_KEYS)("%s: public read exposes a character with at least one compatible weapon", async (externalKey) => {
    const db = getDb();
    const character = await db.query.characters.findFirst({ where: and(eq(charactersTable.releaseId, releaseId), eq(charactersTable.externalKey, externalKey)) });
    expect(character, `character "${externalKey}" should exist in the published release`).toBeTruthy();

    const weaponType = (character!.baseStats as { weaponType?: string }).weaponType;
    expect(weaponType, `character "${externalKey}" should declare a weaponType`).toBeTruthy();

    const compatibleWeapons = await db.query.weapons.findMany({ where: and(eq(weaponsTable.releaseId, releaseId), eq(weaponsTable.weaponType, weaponType!)) });
    expect(compatibleWeapons.length, `character "${externalKey}" (${weaponType}) should have at least one compatible weapon`).toBeGreaterThan(0);
  });

  it.each(EXPANSION_CHARACTER_KEYS)("%s: a minimal build input passes schema and server-side reference validation", async (characterKey) => {
    const db = getDb();
    const character = await db.query.characters.findFirst({ where: and(eq(charactersTable.releaseId, releaseId), eq(charactersTable.externalKey, characterKey)) });
    const weaponType = (character!.baseStats as { weaponType?: string }).weaponType;
    const weapon = await db.query.weapons.findFirst({ where: and(eq(weaponsTable.releaseId, releaseId), eq(weaponsTable.weaponType, weaponType!)) });
    expect(weapon, `character "${characterKey}" (${weaponType}) needs a compatible weapon to build a valid input`).toBeTruthy();

    const parsedInput = buildInputSchema.parse({
      name: `Integration test build (${characterKey})`,
      characterKey,
      weaponKey: weapon!.externalKey,
      activeBuffIds: [],
      partyMemberKeys: [],
      formulaVersion: "integration-test",
      echoes: await buildMinimalEchoSlots(releaseId),
    });

    const references = await getBuildReferences(parsedInput.characterKey, parsedInput.weaponKey, parsedInput.echoes.map((echo) => echo.setKey), parsedInput.echoes.map((echo) => echo.echoKey), releaseId, parsedInput.partyMemberKeys);
    const referenceError = validateBuildReferences(parsedInput, references);
    expect(referenceError, `expected no reference validation error for "${characterKey}", got: ${referenceError}`).toBeNull();
  });
});
