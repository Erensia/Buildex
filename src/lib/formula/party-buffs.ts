import type { ConditionalBuff } from "./stats";

export type PartyBuffDefinition = {
  targetCharacterKey: string;
  providerCharacterKey: string;
  externalKey: string;
  label: string;
  condition: string;
  stats: unknown;
};

export type PartyBuffEvidence = {
  buff: ConditionalBuff;
  requiredMemberKey: string;
  available: boolean;
};

/** Resolves data-release-specific party buffs so historic builds remain reproducible. */
export function resolvePartyBuffs(targetCharacterKey: string, partyMemberKeys: string[], definitions: PartyBuffDefinition[]): PartyBuffEvidence[] {
  const partyMembers = new Set(partyMemberKeys);
  return definitions
    .filter((definition) => definition.targetCharacterKey === targetCharacterKey)
    .map((definition) => ({ buff: { id: definition.externalKey, label: definition.label, condition: definition.condition, stats: definition.stats as ConditionalBuff["stats"] }, requiredMemberKey: definition.providerCharacterKey, available: partyMembers.has(definition.providerCharacterKey) }));
}

export function getPersonalBuffs(characterKey: string, weaponKey?: string): ConditionalBuff[] {
  if (characterKey !== "changli") return [];
  return weaponKey === "blazing-brilliance" ? [{ id: "changli-signature-max-stacks", label: "장리 전용무기 최대 중첩", condition: "최대 중첩을 획득한 상태", stats: { attackPercent: 12, resonanceSkillDamageBonus: 56 } }] : [];
}
