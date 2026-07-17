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

  it("accepts Resonance Liberation DMG Bonus as an echo substat", () => {
    const result = buildInputSchema.safeParse({
      name: "Liberation build", characterKey: "zani", weaponKey: "weapon", formulaVersion: "ww-3.5.0",
      echoes: [1, 2, 3, 4, 5].map((slot) => ({ ...echo, slot, echoKey: `echo-${slot}`, cost: slot === 1 ? 4 : slot < 4 ? 3 : 1, subStats: slot === 1 ? [{ key: "resonanceLiberationDamageBonus", value: 10.1 }] : [] })),
    });
    expect(result.success).toBe(true);
  });

  it("uses the shared damage roll range for attack and HP percentages", () => {
    const input = { name: "Roll test", characterKey: "changli", weaponKey: "weapon", formulaVersion: "ww-3.5.0", echoes: [1, 2, 3, 4, 5].map((slot) => ({ ...echo, slot, echoKey: `echo-${slot}`, cost: slot === 1 ? 4 : slot < 4 ? 3 : 1, subStats: slot === 1 ? [{ key: "attackPercent", value: 6.4 }, { key: "healthPercent", value: 11.6 }] : [] })) };
    expect(buildInputSchema.safeParse(input).success).toBe(true);
    expect(buildInputSchema.safeParse({ ...input, echoes: input.echoes.map((item) => item.slot === 1 ? { ...item, subStats: [{ key: "attackPercent", value: 8.1 }] } : item) }).success).toBe(false);
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

  it("rejects duplicate or unsupported substats on one echo", () => {
    const result = buildInputSchema.safeParse({
      name: "Test", characterKey: "changli", weaponKey: "weapon", formulaVersion: "ww-2.0.0",
      echoes: [1, 2, 3, 4, 5].map((slot) => ({ ...echo, slot, echoKey: `echo-${slot}`, cost: slot === 1 ? 4 : slot < 4 ? 3 : 1, subStats: slot === 1 ? [{ key: "critRate", value: 8 }, { key: "critRate", value: 7 }] : [] })),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a substat value that is not an in-game Echo roll", () => {
    const result = buildInputSchema.safeParse({
      name: "Invalid roll", characterKey: "changli", weaponKey: "weapon", formulaVersion: "ww-2.0.0",
      echoes: [1, 2, 3, 4, 5].map((slot) => ({ ...echo, slot, echoKey: `echo-${slot}`, cost: slot === 1 ? 4 : slot < 4 ? 3 : 1, subStats: slot === 1 ? [{ key: "critRate", value: 8 }] : [] })),
    });
    expect(result.success).toBe(false);
  });
});
