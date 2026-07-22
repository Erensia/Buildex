import { addStats, STANDARD_BASE_STATS } from "./stats";
import type {
  BuildCalculationInput,
  CalculatedStats,
  ConditionalBuff,
  GradeEvaluation,
  GradeRequirement,
  StatSource,
  StatValues,
} from "./stats";
import { BUILD_GRADE, type BuildGrade } from "./versions";

const sumStats = (sources: StatSource[]): StatValues => addStats(...sources.map((source) => source.stats));

/**
 * Calculates the values displayed to the user. Damage multipliers are intentionally
 * not calculated here: this MVP compares transparent final stats and active buffs,
 * rather than estimating a rotation's DPS.
 */
export function calculateBuildStats(
  input: BuildCalculationInput,
  availableBuffs: ConditionalBuff[] = [],
): CalculatedStats {
  const activeBuffIds = new Set(input.activeBuffIds ?? []);
  const activeBuffs = availableBuffs.filter((buff) => activeBuffIds.has(buff.id));
  const stats = sumStats([input.character, input.weapon, ...input.echoes, ...activeBuffs]);
  const baseAttack = stats.baseAttack ?? 0;

  return {
    attack: round(baseAttack * (1 + (stats.attackPercent ?? 0) / 100) + (stats.flatAttack ?? 0)),
    critRate: round(STANDARD_BASE_STATS.critRate + (stats.critRate ?? 0)),
    critDamage: round(STANDARD_BASE_STATS.critDamage + (stats.critDamage ?? 0)),
    energyRegen: round(STANDARD_BASE_STATS.energyRegen + (stats.energyRegen ?? 0)),
    fusionDamageBonus: round(stats.fusionDamageBonus ?? 0),
    spectroDamageBonus: round(stats.spectroDamageBonus ?? 0),
    glacioDamageBonus: round(stats.glacioDamageBonus ?? 0),
    electroDamageBonus: round(stats.electroDamageBonus ?? 0),
    aeroDamageBonus: round(stats.aeroDamageBonus ?? 0),
    havocDamageBonus: round(stats.havocDamageBonus ?? 0),
    basicAttackDamageBonus: round(stats.basicAttackDamageBonus ?? 0),
    heavyAttackDamageBonus: round(stats.heavyAttackDamageBonus ?? 0),
    resonanceSkillDamageBonus: round(stats.resonanceSkillDamageBonus ?? 0),
    resonanceLiberationDamageBonus: round(stats.resonanceLiberationDamageBonus ?? 0),
  };
}

export function evaluateBuildGrade(
  stats: CalculatedStats,
  gradeRequirements: Record<BuildGrade, GradeRequirement[]>,
): GradeEvaluation {
  const achievedGrades = BUILD_GRADE.filter((grade) =>
    gradeRequirements[grade].every((requirement) => stats[requirement.stat] >= requirement.minimum),
  );
  const grade = achievedGrades.at(-1) ?? null;
  const nextGrade = BUILD_GRADE.find((candidate) => !achievedGrades.includes(candidate));

  return {
    grade,
    achievedGrades,
    unmetRequirements: nextGrade
      ? gradeRequirements[nextGrade].filter((requirement) => stats[requirement.stat] < requirement.minimum)
      : [],
  };
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
