import type { GradeRequirement } from "./stats";

type EchoSlot = { slot: number; cost: 1 | 3 | 4; mainStat: string };
type MainStat = { cost: 1 | 3 | 4; statKey: string; value: number };

const mainStatByRequirement: Record<string, string | undefined> = {
  critRate: "critRate",
  critDamage: "critDamage",
  fusionDamageBonus: "fusionDamageBonus",
  energyRegen: "energyRegen",
};

export function getImprovementActions(requirements: GradeRequirement[], slots: EchoSlot[], mainStats: MainStat[]) {
  return requirements.map((requirement) => {
    const targetStat = mainStatByRequirement[requirement.stat];
    const replacement = targetStat && slots.find((slot) => slot.mainStat !== targetStat && mainStats.some((stat) => stat.cost === slot.cost && stat.statKey === targetStat));
    const mainStat = replacement && mainStats.find((stat) => stat.cost === replacement.cost && stat.statKey === targetStat);
    return {
      stat: requirement.stat,
      label: requirement.label,
      minimum: requirement.minimum,
      replacement: replacement && mainStat ? { slot: replacement.slot, statKey: targetStat, value: mainStat.value } : null,
    };
  });
}
