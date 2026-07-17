import type { StatKey } from "./stats";

/** Valid five-star Echo substat roll values, expressed as the values shown in game. */
export const echoSubstatRolls = {
  flatAttack: [30, 40, 50, 60],
  attackPercent: [8.1, 9, 10, 10.9, 11.8, 12.8, 13.8, 14.7],
  flatHealth: [320, 360, 390, 430, 470, 510, 540, 580],
  healthPercent: [8.1, 9, 10, 10.9, 11.8, 12.8, 13.8, 14.7],
  flatDefense: [40, 50, 60, 70],
  defensePercent: [8.1, 9, 10, 10.9, 11.8, 12.8, 13.8, 14.7],
  critRate: [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5],
  critDamage: [12.6, 13.8, 15, 16.2, 17.4, 18.6, 19.8, 21],
  energyRegen: [6.8, 7.6, 8.4, 9.2, 10, 10.8, 11.6, 12.4],
  normalAttackDamageBonus: [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6],
  heavyAttackDamageBonus: [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6],
  resonanceSkillDamageBonus: [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6],
  resonanceLiberationDamageBonus: [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6],
} as const satisfies Partial<Record<StatKey, readonly number[]>>;

export function isValidEchoSubstatRoll(key: keyof typeof echoSubstatRolls, value: number) {
  return echoSubstatRolls[key].includes(value as never);
}
