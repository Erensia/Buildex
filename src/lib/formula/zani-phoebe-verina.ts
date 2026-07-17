import type { GradeRequirement } from "./stats";
import type { BuildGrade } from "./versions";

/**
 * Product thresholds for Zani at S0. They describe the displayed build quality,
 * while temporary party and enemy-state buffs remain opt-in in the calculator.
 */
export const ZANI_S0_GRADE_REQUIREMENTS: Record<BuildGrade, GradeRequirement[]> = {
  standard: [
    { stat: "attack", minimum: 2100, label: "공격력" },
    { stat: "critRate", minimum: 55, label: "치명타 확률" },
    { stat: "critDamage", minimum: 230, label: "치명타 피해" },
    { stat: "energyRegen", minimum: 110, label: "공명 효율" },
    { stat: "spectroDamageBonus", minimum: 60, label: "회절 피해 보너스" },
  ],
  good: [
    { stat: "attack", minimum: 2300, label: "공격력" },
    { stat: "critRate", minimum: 65, label: "치명타 확률" },
    { stat: "critDamage", minimum: 250, label: "치명타 피해" },
    { stat: "energyRegen", minimum: 115, label: "공명 효율" },
    { stat: "spectroDamageBonus", minimum: 75, label: "회절 피해 보너스" },
  ],
  excellent: [
    { stat: "attack", minimum: 2500, label: "공격력" },
    { stat: "critRate", minimum: 75, label: "치명타 확률" },
    { stat: "critDamage", minimum: 270, label: "치명타 피해" },
    { stat: "energyRegen", minimum: 120, label: "공명 효율" },
    { stat: "spectroDamageBonus", minimum: 90, label: "회절 피해 보너스" },
  ],
};
