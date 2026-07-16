import { describe, expect, it } from "vitest";
import { getImprovementActions } from "./build-improvements";

describe("getImprovementActions", () => {
  it("finds an eligible main-stat replacement for a missing criterion", () => {
    const actions = getImprovementActions([{ stat: "critRate", minimum: 80, label: "치명타 확률" }], [{ slot: 1, cost: 4, mainStat: "attackPercent" }], [{ cost: 4, statKey: "critRate", value: 22 }]);
    expect(actions[0].replacement).toEqual({ slot: 1, statKey: "critRate", value: 22 });
  });
});
