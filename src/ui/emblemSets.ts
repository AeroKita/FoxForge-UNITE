// Data-driven descriptor for the emblem color-set infographic. Threshold
// numbers come from the live bundle (setBonuses); the human labels are curated
// because the bundle stores pink/navy/gray on a placeholder stat field (the
// engine maps colors to stats separately in formulas.ts/setBonusStat).

import { setBonuses } from "../data/gameData";
import type { EmblemColor } from "../types";

export interface SetTier {
  count: number; // emblems of this color needed
  /** Whole-number magnitude. Part 1 drops `percent`; both are filled until then. */
  value: number;
  percent: number; // magnitude in whole %, e.g. 4 for +4%
}

export interface SetInfoRow {
  color: EmblemColor;
  label: string; // what the set affects
  kind: "stat" | "utility";
  note?: string;
  unit?: "percent" | "flat";
  sign?: "+" | "−";
  tiers: SetTier[];
}

const META: Record<EmblemColor, { label: string; kind: "stat" | "utility"; note?: string }> = {
  brown: { label: "Attack", kind: "stat" },
  green: { label: "Sp. Atk", kind: "stat" },
  blue: { label: "Defense", kind: "stat" },
  purple: { label: "Sp. Def", kind: "stat" },
  white: { label: "HP", kind: "stat" },
  red: { label: "Attack Speed", kind: "stat" },
  yellow: { label: "Movement Speed", kind: "stat", note: "Out of combat" },
  black: { label: "Cooldown reduction", kind: "stat" },
  pink: { label: "Tenacity", kind: "utility", note: "Shortens hindrances" },
  navy: { label: "Unite charge rate", kind: "utility" },
  gray: { label: "Damage reduction", kind: "utility" },
};

const byColor = new Map(setBonuses.map((s) => [s.color, s]));

/** All 11 color sets with their tiers, ordered stat sets first. */
export const EMBLEM_SET_INFO: SetInfoRow[] = (Object.keys(META) as EmblemColor[]).map((color) => {
  const def = byColor.get(color);
  const tiers: SetTier[] = def
    ? Object.entries(def.thresholds)
        .map(([count, pct]) => {
          const magnitude = Math.round(Math.abs(pct) * 100);
          return { count: Number(count), value: magnitude, percent: magnitude };
        })
        .sort((a, b) => a.count - b.count)
    : [];
  return { color, ...META[color], tiers };
});

/** Format the signed magnitude for a set tier (`+1%`, `−3`). Stub until Part 1. */
export function formatSetMagnitude(_row: SetInfoRow, _value: number): string {
  return "";
}

/** Format a reached tier as in-game wording (`+1% Attack`). Stub until Part 1. */
export function formatSetTier(_row: SetInfoRow, _tier: SetTier): string {
  return "";
}
