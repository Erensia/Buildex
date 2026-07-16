import { describe, expect, it } from "vitest";
import { gameDataSchema } from "./game-data";

const character = {
  entity: "character" as const,
  gameSlug: "wuthering-waves",
  externalKey: "example-character",
  name: "예시 캐릭터",
  role: "메인 딜러",
  dataVersion: "3.5",
  sourceSnapshot: "2026-07-16",
  sourceUrl: "https://example.com/source",
  baseStats: { baseAttack: 400, weaponType: "sword" },
};

describe("gameDataSchema", () => {
  it("accepts a fully traceable game-data record", () => {
    expect(gameDataSchema.safeParse(character).success).toBe(true);
  });

  it("requires a valid source URL and snapshot date", () => {
    expect(gameDataSchema.safeParse({ ...character, sourceUrl: "not-a-url" }).success).toBe(false);
    expect(gameDataSchema.safeParse({ ...character, sourceSnapshot: "2026/07/16" }).success).toBe(false);
  });
});
