import type { ConditionalBuff, GradeRequirement } from "./stats";
import type { BuildGrade } from "./versions";

/**
 * The first MVP party. Buffs are not applied implicitly: the UI must confirm that
 * each listed condition is active, then pass its id to the calculator. This keeps
 * the displayed result auditable when a rotation or game version changes.
 */
export const CHANGLI_LUPA_BRANT_BUFFS: ConditionalBuff[] = [
  {
    id: "lupa-fusion-window",
    label: "루파의 융해 피해 강화",
    condition: "루파의 해당 강화 효과가 적용 중일 때",
    stats: { fusionDamageBonus: 15 },
  },
  {
    id: "brant-fusion-window",
    label: "브랜트의 융해 피해 강화",
    condition: "브랜트의 해당 강화 효과가 적용 중이고, 장리가 다음 등장 캐릭터일 때",
    stats: { fusionDamageBonus: 25, resonanceSkillDamageBonus: 25 },
  },
];

/**
 * Product thresholds for Changli at S0 with her signature weapon. They are kept as
 * data rather than embedded in the evaluator so verified patch values can replace
 * them without changing calculation behaviour.
 */
export const CHANGLI_S0_SIGNATURE_GRADE_REQUIREMENTS: Record<BuildGrade, GradeRequirement[]> = {
  standard: [
    { stat: "attack", minimum: 2400, label: "공격력" },
    { stat: "critRate", minimum: 60, label: "치명타 확률" },
    { stat: "critDamage", minimum: 250, label: "치명타 피해" },
    { stat: "energyRegen", minimum: 120, label: "공명 효율" },
  ],
  good: [
    { stat: "attack", minimum: 2600, label: "공격력" },
    { stat: "critRate", minimum: 70, label: "치명타 확률" },
    { stat: "critDamage", minimum: 270, label: "치명타 피해" },
    { stat: "energyRegen", minimum: 130, label: "공명 효율" },
    { stat: "fusionDamageBonus", minimum: 60, label: "융해 피해 보너스" },
  ],
  excellent: [
    { stat: "attack", minimum: 2800, label: "공격력" },
    { stat: "critRate", minimum: 80, label: "치명타 확률" },
    { stat: "critDamage", minimum: 290, label: "치명타 피해" },
    { stat: "energyRegen", minimum: 130, label: "공명 효율" },
    { stat: "fusionDamageBonus", minimum: 75, label: "융해 피해 보너스" },
  ],
};
