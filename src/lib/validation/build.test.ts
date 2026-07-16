import { describe, expect, it } from "vitest";
import { buildInputSchema } from "./build";

const echo = { echoKey: "fusion-dreadmane", setKey: "molten-rift", cost: 1, mainStat: "attackPercent", subStats: [] };

describe("buildInputSchema", () => {
  it("accepts a complete five-echo build", () => {
    const result = buildInputSchema.safeParse({
      name: "Changli baseline",
      characterKey: "changli",
      weaponKey: "blazing-brilliance",
      formulaVersion: "ww-2.0.0",
      echoes: [
        { ...echo, slot: 1, echoKey: "nightmare-inferno-rider", cost: 4 },
        { ...echo, slot: 2, echoKey: "violet-feathered-heron", cost: 3 },
        { ...echo, slot: 3, echoKey: "violet-feathered-heron", cost: 3 },
        { ...echo, slot: 4, cost: 1 },
        { ...echo, slot: 5, cost: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a build with fewer than five echoes", () => {
    const result = buildInputSchema.safeParse({ name: "Test", characterKey: "changli", weaponKey: "weapon", formulaVersion: "ww-2.0.0", echoes: [{ ...echo, slot: 1 }] });
    expect(result.success).toBe(false);
  });

  it("rejects missing echo selections and invalid slot costs", () => {
    const result = buildInputSchema.safeParse({
      name: "Test",
      characterKey: "changli",
      weaponKey: "weapon",
      formulaVersion: "ww-2.0.0",
      echoes: [
        { ...echo, slot: 1, echoKey: "nightmare-inferno-rider", cost: 4 },
        { ...echo, slot: 2, echoKey: "violet-feathered-heron", cost: 3 },
        { ...echo, slot: 3, echoKey: "violet-feathered-heron", cost: 3 },
        { ...echo, slot: 4, echoKey: "", cost: 1 },
        { ...echo, slot: 5, cost: 3 },
      ],
    });
    expect(result.success).toBe(false);
  });
});
