// Data-driven descriptor for the emblem color-set infographic. Threshold
// numbers come from the live bundle (setBonuses); the human labels follow the
// in-game Effect Description stills in screenshot-references/emblem-color-descriptions/.
// Pink/navy/gray are stored on a placeholder HP field (the engine maps colors
// to stats separately in formulas.ts/setBonusStat). Gray's bundle values
// (−0.03/−0.06/−0.12) are a placeholder; Math.round(Math.abs(pct) * 100)
// yields the flat 3/6/12 the game shows as received damage, not a percent.

import { setBonuses } from "../data/gameData";
import type { EmblemColor } from "../types";

export interface SetTier {
  count: number; // emblems of this color needed
  value: number; // whole number: percent points, or flat amount for gray
}

export interface SetInfoRow {
  color: EmblemColor;
  label: string; // in-game phrase that follows the number
  kind: "stat" | "utility";
  unit: "percent" | "flat";
  sign: "+" | "−";
  tiers: SetTier[];
}

const META: Record<
  EmblemColor,
  { label: string; kind: "stat" | "utility"; unit: "percent" | "flat"; sign: "+" | "−" }
> = {
  brown: { label: "Attack", kind: "stat", unit: "percent", sign: "+" },
  green: { label: "Sp. Atk", kind: "stat", unit: "percent", sign: "+" },
  blue: { label: "Defense", kind: "stat", unit: "percent", sign: "+" },
  purple: { label: "Sp. Def", kind: "stat", unit: "percent", sign: "+" },
  white: { label: "HP", kind: "stat", unit: "percent", sign: "+" },
  red: { label: "basic attack speed", kind: "stat", unit: "percent", sign: "+" },
  yellow: { label: "movement speed when out of combat", kind: "stat", unit: "percent", sign: "+" },
  black: { label: "move cooldown reduction", kind: "stat", unit: "percent", sign: "+" },
  pink: { label: "hindrance effect duration", kind: "utility", unit: "percent", sign: "−" },
  navy: {
    label: "Unite Move gauge time to full charge",
    kind: "utility",
    unit: "percent",
    sign: "−",
  },
  gray: { label: "received damage", kind: "utility", unit: "flat", sign: "−" },
};

const byColor = new Map(setBonuses.map((s) => [s.color, s]));

/** All 11 color sets with their tiers, ordered stat sets first. */
export const EMBLEM_SET_INFO: SetInfoRow[] = (Object.keys(META) as EmblemColor[]).map((color) => {
  const def = byColor.get(color);
  const tiers: SetTier[] = def
    ? Object.entries(def.thresholds)
        .map(([count, pct]) => ({
          count: Number(count),
          value: Math.round(Math.abs(pct) * 100),
        }))
        .sort((a, b) => a.count - b.count)
    : [];
  return { color, ...META[color], tiers };
});

/** Signed magnitude: `+1%`, `−4%`, `−3`. */
export function formatSetMagnitude(row: SetInfoRow, value: number): string {
  return `${row.sign}${value}${row.unit === "percent" ? "%" : ""}`;
}

/** Full in-game tier string: `+1% Attack`, `−3 received damage`. */
export function formatSetTier(row: SetInfoRow, tier: SetTier): string {
  return `${formatSetMagnitude(row, tier.value)} ${row.label}`;
}
