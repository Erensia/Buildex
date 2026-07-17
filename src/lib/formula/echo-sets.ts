import type { ConditionalBuff, StatSource, StatValues } from "./stats";

type EffectRecord = Record<string, unknown>;
export type EchoSetDefinition = { externalKey: string; name: string; effects: EffectRecord };

const statKeys = new Set<keyof StatValues>(["attackPercent", "energyRegen", "fusionDamageBonus", "spectroDamageBonus", "resonanceSkillDamageBonus"]);

function toStats(effect: EffectRecord): StatValues {
  const stats: StatValues = {};
  for (const [key, value] of Object.entries(effect)) {
    if (statKeys.has(key as keyof StatValues) && typeof value === "number") stats[key as keyof StatValues] = value;
  }
  if (typeof effect.partyFusionDamageBonus === "number") stats.fusionDamageBonus = effect.partyFusionDamageBonus;
  if (typeof effect.partySpectroDamageBonus === "number") stats.spectroDamageBonus = effect.partySpectroDamageBonus;
  return stats;
}

export function resolveEchoSetEffects(
  selectedSetKeys: string[],
  definitions: EchoSetDefinition[],
): { automaticSources: StatSource[]; conditionalBuffs: ConditionalBuff[] } {
  const counts = selectedSetKeys.reduce((total, key) => total.set(key, (total.get(key) ?? 0) + 1), new Map<string, number>());
  const automaticSources: StatSource[] = [];
  const conditionalBuffs: ConditionalBuff[] = [];

  for (const [setKey, count] of counts) {
    const set = definitions.find((item) => item.externalKey === setKey);
    if (!set) continue;
    const effects = set.effects;
    const twoPiece = effects.twoPiece as EffectRecord | undefined;
    const fivePiece = effects.fivePiece as EffectRecord | undefined;
    if (count >= 2 && twoPiece) automaticSources.push({ id: `set:${setKey}:two-piece`, label: `${set.name} 2-piece`, stats: toStats(twoPiece) });
    if (count < 5 || !fivePiece) continue;
    const id = `set:${setKey}:five-piece`;
    const condition = typeof fivePiece.condition === "string" ? fivePiece.condition : undefined;
    const source = { id, label: `${set.name} 5-piece`, stats: toStats(fivePiece) };
    if (condition) conditionalBuffs.push({ ...source, condition });
    else automaticSources.push(source);
  }
  return { automaticSources, conditionalBuffs };
}
