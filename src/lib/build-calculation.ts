import type { BuildInput } from "@/lib/validation/build";
import type { StatSource, StatValues } from "@/lib/formula/stats";

type MainStat = { cost: number; statKey: string; value: number };

/** Builds the echo stat sources from the versioned game-data rows used for validation. */
export function getEchoStatSources(input: BuildInput, mainStats: MainStat[]): StatSource[] {
  return input.echoes.map((echo) => {
    const mainStat = mainStats.find((stat) => stat.cost === echo.cost && stat.statKey === echo.mainStat);
    return {
      id: `echo-${echo.slot}`,
      label: `에코 ${echo.slot}`,
      stats: {
        ...(mainStat ? { [mainStat.statKey]: mainStat.value } : {}),
        ...Object.fromEntries(echo.subStats.map((stat) => [stat.key, stat.value])),
      } as StatValues,
    };
  });
}
