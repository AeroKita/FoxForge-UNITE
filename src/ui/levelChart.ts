import type { DerivedBuild } from "../engine/derive";
import type { StatBlock } from "../types";

export type LevelChartKey = keyof StatBlock | "aps";

export interface LevelChartMetric {
  key: LevelChartKey;
  label: string;
  color: string;
}

export const LEVEL_CHART_METRICS: LevelChartMetric[] = [
  { key: "hp", label: "HP", color: "#10b981" },
  { key: "attack", label: "Attack", color: "#ef4444" },
  { key: "defense", label: "Defense", color: "#3b82f6" },
  { key: "spAttack", label: "Sp. Atk", color: "#8b5cf6" },
  { key: "spDefense", label: "Sp. Def", color: "#a855f7" },
  { key: "moveSpeed", label: "Speed", color: "#f59e0b" },
  { key: "critRate", label: "Crit Rate", color: "#f43f5e" },
  { key: "attackSpeed", label: "Atk Speed", color: "#d97706" },
  { key: "cdr", label: "CDR", color: "#64748b" },
  { key: "lifesteal", label: "Lifesteal", color: "#ec4899" },
  { key: "aps", label: "Attacks/sec", color: "#0ea5e9" },
];

const FRACTION_PLOT: ReadonlySet<LevelChartKey> = new Set(["critRate", "cdr", "lifesteal"]);

/**
 * Plotted Y value. Fraction stats are percentage points (20, not 0.20) so the
 * axis is readable. Attack speed uses the boosted point total, which includes
 * toggles; the raw effective fraction does not.
 */
export function levelChartValue(derived: DerivedBuild, key: LevelChartKey): number | null {
  if (!derived.effective) return null;
  if (key === "aps") {
    const v = derived.attackSpeed?.attacksPerSecond;
    return v == null ? null : Number(v.toFixed(3));
  }
  if (key === "attackSpeed") {
    const v = derived.attackSpeed?.asPoints;
    return v == null ? null : Number(v.toFixed(1));
  }
  if (FRACTION_PLOT.has(key)) {
    return Number((derived.effective[key as keyof StatBlock] * 100).toFixed(1));
  }
  return Number(derived.effective[key as keyof StatBlock].toFixed(0));
}
