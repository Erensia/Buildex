import type { BuildGrade } from "./versions";

export type StatKey =
  | "baseAttack"
  | "flatAttack"
  | "attackPercent"
  | "flatHealth"
  | "healthPercent"
  | "flatDefense"
  | "defensePercent"
  | "critRate"
  | "critDamage"
  | "energyRegen"
  | "fusionDamageBonus"
  | "spectroDamageBonus"
  | "glacioDamageBonus"
  | "electroDamageBonus"
  | "aeroDamageBonus"
  | "havocDamageBonus"
  | "basicAttackDamageBonus"
  | "heavyAttackDamageBonus"
  | "resonanceSkillDamageBonus"
  | "resonanceLiberationDamageBonus";

export type StatValues = Partial<Record<StatKey, number>>;

/** Values that every resonator has before any character, weapon, Echo, or buff data. */
export const STANDARD_BASE_STATS = {
  critRate: 5,
  critDamage: 150,
  energyRegen: 100,
} as const;

/** Adds stat contributions without allowing a later source to overwrite an earlier one. */
export function addStats(...sources: StatValues[]): StatValues {
  return sources.reduce<StatValues>((total, source) => {
    for (const [key, value] of Object.entries(source)) {
      const statKey = key as StatKey;
      total[statKey] = (total[statKey] ?? 0) + (value ?? 0);
    }
    return total;
  }, {});
}

export interface StatSource {
  id: string;
  label: string;
  stats: StatValues;
}

export interface ConditionalBuff extends StatSource {
  condition: string;
}

export interface BuildCalculationInput {
  character: StatSource;
  weapon: StatSource;
  echoes: StatSource[];
  activeBuffIds?: string[];
}

export interface CalculatedStats {
  attack: number;
  critRate: number;
  critDamage: number;
  energyRegen: number;
  fusionDamageBonus: number;
  spectroDamageBonus: number;
  glacioDamageBonus: number;
  electroDamageBonus: number;
  aeroDamageBonus: number;
  havocDamageBonus: number;
  basicAttackDamageBonus: number;
  heavyAttackDamageBonus: number;
  resonanceSkillDamageBonus: number;
  resonanceLiberationDamageBonus: number;
}

export interface GradeRequirement {
  stat: keyof CalculatedStats;
  minimum: number;
  label: string;
}

export interface GradeEvaluation {
  grade: BuildGrade | null;
  achievedGrades: BuildGrade[];
  unmetRequirements: GradeRequirement[];
}

export const getStat = (stats: StatValues, key: StatKey) => stats[key] ?? 0;
