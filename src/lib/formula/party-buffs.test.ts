import { describe, expect, it } from "vitest";
import { getPersonalBuffs, resolvePartyBuffs } from "./party-buffs";

const partyBuffs = [
  { targetCharacterKey: "changli", providerCharacterKey: "lupa", externalKey: "lupa-fusion-window", label: "Lupa", condition: "Liberation active", stats: { fusionDamageBonus: 15 } },
  { targetCharacterKey: "changli", providerCharacterKey: "brant", externalKey: "brant-fusion-window", label: "Brant", condition: "Support active", stats: { fusionDamageBonus: 20 } },
];

describe("resolvePartyBuffs", () => {
  it("only makes Changli party buffs available when their provider is in the party", () => {
    const buffs = resolvePartyBuffs("changli", ["lupa"], partyBuffs);

    expect(buffs.find((item) => item.buff.id === "lupa-fusion-window")?.available).toBe(true);
    expect(buffs.find((item) => item.buff.id === "brant-fusion-window")?.available).toBe(false);
  });

  it("keeps a personal signature buff separate from party eligibility", () => {
    expect(getPersonalBuffs("changli", "blazing-brilliance")).toHaveLength(1);
    expect(getPersonalBuffs("changli", "wildfire-mark")).toHaveLength(0);
  });
});
