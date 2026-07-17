import type { StatValues } from "./stats";

const weights: Partial<Record<keyof StatValues, number>> = {
  flatAttack: 0.05,
  critRate: 2,
  critDamage: 1,
  energyRegen: 0.4,
  fusionDamageBonus: 1,
  spectroDamageBonus: 1,
};

export function getSubstatQuality(stats: StatValues) {
  const score = Object.entries(stats).reduce((total, [key, value]) => total + (value ?? 0) * (weights[key as keyof StatValues] ?? 0), 0);
  return { score: Math.round(score * 10) / 10, count: Object.values(stats).filter((value) => typeof value === "number" && value > 0).length };
}
