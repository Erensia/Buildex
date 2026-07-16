import { z } from "zod";

export const echoSchema = z.object({
  slot: z.number().int().min(1).max(5),
  setKey: z.string().min(1).max(80),
  cost: z.union([z.literal(1), z.literal(3), z.literal(4)]),
  mainStat: z.string().min(1).max(80),
  subStats: z.array(z.object({ key: z.string().min(1).max(80), value: z.number().finite().nonnegative() })).max(5),
});

export const buildInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  characterKey: z.string().min(1).max(80),
  weaponKey: z.string().min(1).max(80),
  echoes: z.array(echoSchema).length(5),
  activeBuffIds: z.array(z.string().min(1).max(80)).max(10).default([]),
  formulaVersion: z.string().min(1).max(32),
});

export type BuildInput = z.infer<typeof buildInputSchema>;
