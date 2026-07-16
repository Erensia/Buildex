import type { BuildGrade } from "./versions";

export type StatKey =
  | "baseAttack"
  | "flatAttack"
  | "attackPercent"
  | "critRate"
  | "critDamage"
  | "energyRegen"
  | "fusionDamageBonus"
  | "resonanceSkillDamageBonus";

export type StatValues = Partial<Record<StatKey, number>>;

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
  resonanceSkillDamageBonus: number;
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
