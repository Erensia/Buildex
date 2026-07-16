import { z } from "zod";

const subStatKeys = ["flatAttack", "critRate", "critDamage", "energyRegen", "fusionDamageBonus"] as const;

export const echoSchema = z.object({
  slot: z.number().int().min(1).max(5),
  echoKey: z.string().min(1).max(80),
  setKey: z.string().min(1).max(80),
  cost: z.union([z.literal(1), z.literal(3), z.literal(4)]),
  mainStat: z.string().min(1).max(80),
  subStats: z.array(z.object({ key: z.enum(subStatKeys), value: z.number().finite().nonnegative().max(100) })).max(5).superRefine((subStats, context) => {
    const seenKeys = new Set<string>();
    for (const [index, subStat] of subStats.entries()) {
      if (seenKeys.has(subStat.key)) context.addIssue({ code: "custom", path: [index, "key"], message: "Each substat can only appear once per echo." });
      seenKeys.add(subStat.key);
    }
  }),
});

export const buildInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  characterKey: z.string().min(1).max(80),
  weaponKey: z.string().min(1).max(80),
  echoes: z.array(echoSchema).length(5).superRefine((echoes, context) => {
    const expectedCosts = new Map([[1, 4], [2, 3], [3, 3], [4, 1], [5, 1]]);
    const seenSlots = new Set<number>();

    for (const [index, echo] of echoes.entries()) {
      if (seenSlots.has(echo.slot)) {
        context.addIssue({ code: "custom", path: [index, "slot"], message: "Each echo slot must be unique." });
      }
      seenSlots.add(echo.slot);
      if (echo.cost !== expectedCosts.get(echo.slot)) {
        context.addIssue({ code: "custom", path: [index, "cost"], message: "The selected echo cost does not match this slot." });
      }
    }
  }),
  activeBuffIds: z.array(z.string().min(1).max(80)).max(10).default([]),
  formulaVersion: z.string().min(1).max(32),
});

export type BuildInput = z.infer<typeof buildInputSchema>;
