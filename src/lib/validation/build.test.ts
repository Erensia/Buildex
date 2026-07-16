import { describe, expect, it } from "vitest";
import { buildInputSchema } from "./build";

const echo = { setKey: "molten-rift", cost: 1, mainStat: "ATK%", subStats: [] };

describe("buildInputSchema", () => {
  it("accepts a complete five-echo build", () => {
    const result = buildInputSchema.safeParse({
      name: "Changli baseline",
      characterKey: "changli",
      weaponKey: "blazing-brilliance",
      formulaVersion: "ww-2.0.0",
      echoes: [1, 2, 3, 4, 5].map((slot) => ({ ...echo, slot })),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a build with fewer than five echoes", () => {
    const result = buildInputSchema.safeParse({ name: "Test", characterKey: "changli", weaponKey: "weapon", formulaVersion: "ww-2.0.0", echoes: [{ ...echo, slot: 1 }] });
    expect(result.success).toBe(false);
  });
});
