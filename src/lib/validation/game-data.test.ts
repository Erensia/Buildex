import { describe, expect, it } from "vitest";
import { gameDataSchema } from "./game-data";

const character = {
  entity: "character" as const,
  releaseId: "70000000-0000-4000-8000-000000000001",
  gameSlug: "wuthering-waves",
  externalKey: "example-character",
  name: "예시 캐릭터",
  role: "메인 딜러",
  dataVersion: "3.5",
  sourceSnapshot: "2026-07-16",
  sourceUrl: "https://example.com/source",
  baseStats: { baseAttack: 400, element: "fusion", weaponType: "sword" },
};

describe("gameDataSchema", () => {
  it("accepts a fully traceable game-data record", () => {
    expect(gameDataSchema.safeParse(character).success).toBe(true);
  });

  it("requires a valid source URL and snapshot date", () => {
    expect(gameDataSchema.safeParse({ ...character, sourceUrl: "not-a-url" }).success).toBe(false);
    expect(gameDataSchema.safeParse({ ...character, sourceSnapshot: "2026/07/16" }).success).toBe(false);
  });

  it("rejects unsupported stat keys and incomplete character base stats", () => {
    expect(gameDataSchema.safeParse({ ...character, baseStats: { baseAttack: 400, weaponType: "sword" } }).success).toBe(false);
    expect(gameDataSchema.safeParse({ ...character, entity: "weapon", weaponType: "sword", stats: { unsupported: 1 } }).success).toBe(false);
    expect(gameDataSchema.safeParse({ ...character, entity: "mainStat", cost: 3, statKey: "unsupported", value: 30 }).success).toBe(false);
  });

  it("accepts a traceable party bundle and rejects duplicate character keys", () => {
    const partyBundle = {
      entity: "partyBundle" as const,
      releaseId: character.releaseId,
      gameSlug: character.gameSlug,
      partyName: "기류 파티",
      focusElement: "aero",
      dataVersion: character.dataVersion,
      sourceSnapshot: character.sourceSnapshot,
      sourceUrl: character.sourceUrl,
      members: [
        { externalKey: "jiyan", name: "기염", role: "메인 딜러", baseStats: { baseAttack: 412, element: "aero", weaponType: "broadblade", level: 90 }, sourceUrl: "https://example.com/jiyan" },
        { externalKey: "mortefi", name: "모르테피", role: "서브 딜러", baseStats: { baseAttack: 241, element: "fusion", weaponType: "pistol", level: 90 }, sourceUrl: "https://example.com/mortefi" },
        { externalKey: "verina", name: "벨리나", role: "힐러", baseStats: { baseAttack: 349, element: "spectro", weaponType: "rectifier", level: 90 }, sourceUrl: "https://example.com/verina" },
      ],
    };

    expect(gameDataSchema.safeParse(partyBundle).success).toBe(true);
    expect(gameDataSchema.safeParse({ ...partyBundle, members: [partyBundle.members[0], partyBundle.members[0], partyBundle.members[2]] }).success).toBe(false);
    expect(gameDataSchema.safeParse({ ...partyBundle, members: [...partyBundle.members, partyBundle.members[0]] }).success).toBe(false);
  });
});
