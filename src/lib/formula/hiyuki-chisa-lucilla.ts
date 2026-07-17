import type { ConditionalBuff, GradeRequirement } from "./stats";
import type { BuildGrade } from "./versions";

/** Buffs supplied by the recommended Hiyuki / Lucilla / Chisa rotation.
 * Damage amplification and DEF reduction are intentionally disclosed in labels but
 * excluded until the planner gains a rotation-DPS damage model. */
export const HIYUKI_CHISA_LUCILLA_BUFFS: ConditionalBuff[] = [
  {
    id: "chisa-rejuvenating-glow",
    label: "치사: 찬란한 광휘 5세트",
    condition: "치사의 치료 효과 발동 후",
    stats: { attackPercent: 15 },
  },
  {
    id: "lucilla-freeze-frame",
    label: "루실라: 정지된 순간",
    condition: "루실라가 서리 효과를 부여한 후",
    stats: { attackPercent: 24 },
  },
  {
    id: "lucilla-snowfall-outro",
    label: "루실라: 기도의 눈 5세트 아웃트로",
    condition: "루실라가 아웃트로로 히유키를 교체한 후",
    stats: { glacioDamageBonus: 25 },
  },
];

export const HIYUKI_S0_SIGNATURE_GRADE_REQUIREMENTS: Record<BuildGrade, GradeRequirement[]> = {
  standard: [
    { stat: "attack", minimum: 2300, label: "공격력" },
    { stat: "critRate", minimum: 65, label: "치명타 확률" },
    { stat: "critDamage", minimum: 250, label: "치명타 피해" },
    { stat: "energyRegen", minimum: 125, label: "공명 효율" },
    { stat: "glacioDamageBonus", minimum: 60, label: "응결 피해 보너스" },
  ],
  good: [
    { stat: "attack", minimum: 2500, label: "공격력" },
    { stat: "critRate", minimum: 70, label: "치명타 확률" },
    { stat: "critDamage", minimum: 270, label: "치명타 피해" },
    { stat: "energyRegen", minimum: 130, label: "공명 효율" },
    { stat: "glacioDamageBonus", minimum: 75, label: "응결 피해 보너스" },
  ],
  excellent: [
    { stat: "attack", minimum: 2700, label: "공격력" },
    { stat: "critRate", minimum: 80, label: "치명타 확률" },
    { stat: "critDamage", minimum: 290, label: "치명타 피해" },
    { stat: "energyRegen", minimum: 130, label: "공명 효율" },
    { stat: "glacioDamageBonus", minimum: 85, label: "응결 피해 보너스" },
  ],
};
