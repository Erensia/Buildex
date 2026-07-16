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
    label: "루파 반향 스킬: 울부짖는 늑대의 불꽃 5세트",
    condition: "루파가 공명 해방을 발동한 뒤 35초 동안",
    stats: { fusionDamageBonus: 15 },
  },
  {
    id: "brant-fusion-window",
    label: "브렌트 반주: 항로 확정!",
    condition: "브렌트의 반주 스킬 후 장리가 다음 등장 캐릭터이며, 교체 전 14초 동안",
    stats: { fusionDamageBonus: 20, resonanceSkillDamageBonus: 25 },
  },
  {
    id: "changli-signature-max-stacks",
    label: "장리 전무: 솟아오르는 화염 최대 스택",
    condition: "피해 적중 또는 공명 스킬로 최대 스택을 쌓았을 때",
    stats: { attackPercent: 12, resonanceSkillDamageBonus: 56 },
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
    { stat: "critRate", minimum: 65, label: "치명타 확률" },
    { stat: "critDamage", minimum: 255, label: "치명타 피해" },
    { stat: "energyRegen", minimum: 120, label: "공명 효율" },
  ],
  good: [
    { stat: "attack", minimum: 2600, label: "공격력" },
    { stat: "critRate", minimum: 70, label: "치명타 확률" },
    { stat: "critDamage", minimum: 260, label: "치명타 피해" },
    { stat: "energyRegen", minimum: 130, label: "공명 효율" },
    { stat: "fusionDamageBonus", minimum: 60, label: "융해 피해 보너스" },
  ],
  excellent: [
    { stat: "attack", minimum: 2800, label: "공격력" },
    { stat: "critRate", minimum: 80, label: "치명타 확률" },
    { stat: "critDamage", minimum: 280, label: "치명타 피해" },
    { stat: "energyRegen", minimum: 130, label: "공명 효율" },
    { stat: "fusionDamageBonus", minimum: 75, label: "융해 피해 보너스" },
  ],
};
