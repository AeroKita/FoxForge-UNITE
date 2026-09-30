import type { ActiveBoost } from "../engine/effects";
import { boostAvailableAtLevel, boostPointsAtLevel } from "../engine/effects";
import type { StatBlock } from "../types";
import { STAT_ROWS } from "./format";

const FRACTION_STATS: ReadonlySet<keyof StatBlock> = new Set([
  "critRate",
  "cdr",
  "lifesteal",
  "spLifesteal",
  "attackSpeed",
]);

function statLabel(stat: keyof StatBlock): string {
  return STAT_ROWS.find((row) => row.key === stat)?.label ?? stat;
}

function signedPercent(points: number): string {
  const sign = points >= 0 ? "+" : "";
  return `${sign}${points.toFixed(1)}%`;
}

/** Level used to describe a boost that is outside its window. */
function effectPreviewLevel(boost: ActiveBoost, level: number): number {
  if (boostAvailableAtLevel(boost, level)) return level;
  if (boost.minLevel != null && level < boost.minLevel) return boost.minLevel;
  if (boost.maxLevel != null) return boost.maxLevel;
  return level;
}

/** Why a row is disabled, or "" when the boost applies at this level. */
export function boostLevelGate(boost: ActiveBoost, level: number): string {
  if (boostAvailableAtLevel(boost, level)) return "";
  if (boost.minLevel != null && level < boost.minLevel) return ` (Lv ${boost.minLevel}+)`;
  if (boost.maxLevel != null && level > boost.maxLevel) return ` (through Lv ${boost.maxLevel})`;
  return "";
}

/** Every stat a toggle changes, for the Active Effects row. */
export function formatBoostEffect(boost: ActiveBoost, level: number): string {
  const preview = effectPreviewLevel(boost, level);
  const parts: string[] = [];
  if (boost.asPoints !== 0 || boost.perLevel != null) {
    parts.push(`${signedPercent(boostPointsAtLevel(boost, preview))} AS`);
  }
  for (const [stat, mult] of Object.entries(boost.statMultipliers ?? {}) as [
    keyof StatBlock,
    number,
  ][]) {
    if (FRACTION_STATS.has(stat) && mult === 1) {
      parts.push(`×2 ${statLabel(stat)}`);
    } else {
      parts.push(`${signedPercent(mult * 100)} ${statLabel(stat)}`);
    }
  }
  for (const [stat, add] of Object.entries(boost.statAdds ?? {}) as [keyof StatBlock, number][]) {
    if (FRACTION_STATS.has(stat)) {
      parts.push(`${signedPercent(add * 100)} ${statLabel(stat)}`);
    } else {
      const sign = add >= 0 ? "+" : "";
      parts.push(`${sign}${Math.round(add)} ${statLabel(stat)}`);
    }
  }
  if (boost.effectText) parts.push(boost.effectText);
  return parts.join(", ");
}
