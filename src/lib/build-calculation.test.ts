import { describe, expect, it } from "vitest";
import { getEchoStatSources } from "./build-calculation";

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
});
