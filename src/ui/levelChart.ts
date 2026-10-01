import type { DerivedBuild } from "../engine/derive";
import type { StatBlock } from "../types";

export type LevelChartKey = keyof StatBlock | "aps";

export interface LevelChartMetric {
  key: LevelChartKey;
  label: string;
  color: string;
  /** Plotted value is already percentage points. Tooltip and axis append this. */
  suffix?: "%";
}

export const LEVEL_CHART_METRICS: LevelChartMetric[] = [
  { key: "hp", label: "HP", color: "#10b981" },
  { key: "attack", label: "Attack", color: "#ef4444" },
  { key: "defense", label: "Defense", color: "#3b82f6" },
  { key: "spAttack", label: "Sp. Atk", color: "#8b5cf6" },
  { key: "spDefense", label: "Sp. Def", color: "#a855f7" },
  { key: "moveSpeed", label: "Speed", color: "#f59e0b" },
  { key: "critRate", label: "Crit Rate", color: "#f43f5e", suffix: "%" },
  { key: "cdr", label: "CDR", color: "#64748b", suffix: "%" },
  { key: "lifesteal", label: "Lifesteal", color: "#ec4899", suffix: "%" },
  { key: "attackSpeed", label: "Atk Speed", color: "#d97706", suffix: "%" },
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

/**
 * Display string for a plotted point. Percent metrics append `%`; the plotted
 * number itself stays a percentage point so the line scale does not change.
 */
export function formatLevelChartValue(value: number, key: LevelChartKey): string {
  const suffix = LEVEL_CHART_METRICS.find((m) => m.key === key)?.suffix ?? "";
  // Axis ticks can carry binary float noise. Three decimals matches the finest
  // plotted series (attacks/sec) and turns 40.0000002 into 40.
  const body = String(Number(value.toFixed(3)));
  return `${body}${suffix}`;
}
