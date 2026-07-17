import { describe, expect, it } from "vitest";
import { resolveEchoSetEffects } from "./echo-sets";

const moltenRift = {
  externalKey: "molten-rift",
  name: "Molten Rift",
  effects: { twoPiece: { fusionDamageBonus: 10 }, fivePiece: { condition: "Use Resonance Skill", fusionDamageBonus: 30 } },
};

describe("resolveEchoSetEffects", () => {
  it("applies the two-piece bonus and exposes an opted-in five-piece bonus", () => {
    const inactive = resolveEchoSetEffects(["molten-rift", "molten-rift", "molten-rift", "molten-rift", "molten-rift"], [moltenRift]);
    const active = resolveEchoSetEffects(["molten-rift", "molten-rift", "molten-rift", "molten-rift", "molten-rift"], [moltenRift]);

    expect(inactive.automaticSources).toEqual([{ id: "set:molten-rift:two-piece", label: "Molten Rift 2-piece", stats: { fusionDamageBonus: 10 } }]);
    expect(inactive.conditionalBuffs).toHaveLength(1);
    expect(active.automaticSources).toHaveLength(1);
  });

  it("applies Spectro set bonuses using the same data-driven path", () => {
    const celestialLight = {
      externalKey: "celestial-light",
      name: "Celestial Light",
      effects: { twoPiece: { spectroDamageBonus: 10 } },
    };

    const result = resolveEchoSetEffects(["celestial-light", "celestial-light"], [celestialLight]);

    expect(result.automaticSources).toEqual([
      { id: "set:celestial-light:two-piece", label: "Celestial Light 2-piece", stats: { spectroDamageBonus: 10 } },
    ]);
  });
});
