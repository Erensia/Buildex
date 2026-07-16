import { describe, expect, it } from "vitest";
import { CHANGLI_LUPA_BRANT_BUFFS, CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS } from "./changli-lupa-brant";
import { calculateBuildStats, evaluateBuildGrade } from "./build-calculator";

const baselineBuild = {
  character: { id: "changli", label: "장리", stats: { baseAttack: 1000, critRate: 5, critDamage: 150, energyRegen: 100 } },
  weapon: { id: "blazing-brilliance", label: "솟아오르는 화염", stats: { baseAttack: 500, critRate: 24.3 } },
  echoes: [{ id: "echoes", label: "에코", stats: { attackPercent: 60, flatAttack: 200, critRate: 50, critDamage: 120, energyRegen: 30, fusionDamageBonus: 60 } }],
};

describe("calculateBuildStats", () => {
  it("applies percentage attack to the combined character and weapon base attack", () => {
    const result = calculateBuildStats(baselineBuild);

    expect(result).toMatchObject({ attack: 2600, critRate: 79.3, critDamage: 270, energyRegen: 130, fusionDamageBonus: 60 });
  });

  it("only applies party buffs whose conditions were confirmed", () => {
    const withoutBuff = calculateBuildStats(baselineBuild, CHANGLI_LUPA_BRANT_BUFFS);
    const withBuff = calculateBuildStats({ ...baselineBuild, activeBuffIds: ["lupa-fusion-window", "brant-fusion-window"] }, CHANGLI_LUPA_BRANT_BUFFS);

    expect(withoutBuff.fusionDamageBonus).toBe(60);
    expect(withBuff).toMatchObject({ fusionDamageBonus: 95, resonanceSkillDamageBonus: 25 });
  });
});

describe("evaluateBuildGrade", () => {
  it("returns the highest satisfied grade and the next missing requirements", () => {
    const result = evaluateBuildGrade(calculateBuildStats(baselineBuild), CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS);

    expect(result.grade).toBe("good");
    expect(result.unmetRequirements).toEqual([
      { stat: "attack", minimum: 2800, label: "공격력" },
      { stat: "critRate", minimum: 80, label: "치명타 확률" },
      { stat: "critDamage", minimum: 280, label: "치명타 피해" },
      { stat: "fusionDamageBonus", minimum: 75, label: "융해 피해 보너스" },
    ]);
  });
});
