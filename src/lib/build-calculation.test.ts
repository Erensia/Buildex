import { describe, expect, it } from "vitest";
import { getEchoStatSources } from "./build-calculation";
import { buildInputSchema } from "./validation/build";

describe("getEchoStatSources", () => {
  it("uses the supplied game-data value instead of a hard-coded main-stat value", () => {
    const input = {
      name: "Test", characterKey: "changli", weaponKey: "blazing-brilliance", formulaVersion: "test",
      activeBuffIds: [],
      echoes: [1, 2, 3, 4, 5].map((slot) => ({ slot, echoKey: `echo-${slot}`, setKey: "set", cost: slot === 1 ? 4 : slot < 4 ? 3 : 1, mainStat: "attackPercent", subStats: [] })),
    };

    const sources = getEchoStatSources(input, [{ cost: 4, statKey: "attackPercent", value: 37 }]);

    expect(sources[0].stats.attackPercent).toBe(37);
  });

  it("adds an Echo main stat and substat when they use the same stat key", () => {
    const input = buildInputSchema.parse({
      name: "Same stat key",
      characterKey: "changli",
      weaponKey: "weapon",
      activeBuffIds: [],
      partyMemberKeys: [],
      formulaVersion: "ww-3.5.0",
      echoes: [1, 2, 3, 4, 5].map((slot) => ({
        slot,
        echoKey: `echo-${slot}`,
        setKey: "set",
        cost: slot === 1 ? 4 : slot < 4 ? 3 : 1,
        mainStat: "attackPercent",
        subStats: slot === 1 ? [{ key: "attackPercent", value: 6.4 }] : [],
      })),
    });

    const sources = getEchoStatSources(input, [{ cost: 4, statKey: "attackPercent", value: 37 }]);

    expect(sources[0].stats.attackPercent).toBe(43.4);
  });
});
