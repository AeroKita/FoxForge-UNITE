import type { StatBlock } from "../types";

export type StatKind = "int" | "percent";

export interface StatRow {
  key: keyof StatBlock;
  label: string;
  kind: StatKind;
}

// Display order + labels for the stat panel.
export const STAT_ROWS: StatRow[] = [
  { key: "hp", label: "HP", kind: "int" },
  { key: "attack", label: "Attack", kind: "int" },
  { key: "defense", label: "Defense", kind: "int" },
  { key: "spAttack", label: "Sp. Atk", kind: "int" },
  { key: "spDefense", label: "Sp. Def", kind: "int" },
  { key: "attackSpeed", label: "Atk Speed", kind: "percent" },
  { key: "critRate", label: "Crit Rate", kind: "percent" },
  { key: "cdr", label: "CDR", kind: "percent" },
  { key: "lifesteal", label: "Lifesteal", kind: "percent" },
  { key: "moveSpeed", label: "Move Speed", kind: "int" },
];

export function formatStat(value: number, kind: StatKind): string {
  if (kind === "percent") return `${(value * 100).toFixed(1)}%`;
  return Math.round(value).toLocaleString();
}

export function formatDelta(value: number, kind: StatKind): string {
  const sign = value > 0 ? "+" : "";
  if (kind === "percent") return `${sign}${(value * 100).toFixed(1)}%`;
  return `${sign}${Math.round(value).toLocaleString()}`;
}

/** Max fractional digits for UNITE-DB held-item stats (e.g. 8.75%, 15.25 Atk). */
const HELD_ITEM_DECIMALS = 4;

/** Strip float noise; never Math.round — integers stay integer, fractions keep UNITE-DB precision. */
function trimHeldDecimals(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(HELD_ITEM_DECIMALS).replace(/\.?0+$/, "");
}

/** Exact held-item / live-stat display (Basic + Advanced): no standard rounding. */
export function formatExactStatValue(value: number, kind: StatKind): string {
  if (kind === "percent") return `${trimHeldDecimals(value * 100)}%`;
  return value < 0 ? `-${trimHeldDecimals(Math.abs(value))}` : trimHeldDecimals(value);
}

export function formatExactDelta(value: number, kind: StatKind): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (kind === "percent") return `${sign}${trimHeldDecimals(abs * 100)}%`;
  return `${sign}${trimHeldDecimals(abs)}`;
}

export interface StatLine {
  key: keyof StatBlock;
  label: string;
  value: string; // signed, formatted
  sign: "pos" | "neg" | "zero";
}

/** Signed value keeping one decimal when not whole (Advanced precision). UNITE
 *  applies standard rounding in-game (28.6→29), which formatDelta does. */
function formatPrecise(value: number, kind: StatKind): string {
  const sign = value > 0 ? "+" : "";
  if (kind === "percent") return `${sign}${(value * 100).toFixed(1)}%`;
  return `${sign}${Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)}`;
}

/**
 * Non-zero stats of a partial block as signed display lines (emblem/item
 * summaries). `precise` keeps decimals (Advanced); otherwise standard rounding.
 * `exact` never rounds — used for held items (UNITE-DB per-grade values).
 */
export function statLines(stats: Partial<StatBlock>, precise = false, exact = false): StatLine[] {
  const out: StatLine[] = [];
  for (const row of STAT_ROWS) {
    const v = stats[row.key];
    if (v == null || v === 0) continue;
    const value = exact
      ? formatExactDelta(v, row.kind)
      : precise
        ? formatPrecise(v, row.kind)
        : formatDelta(v, row.kind);
    out.push({ key: row.key, label: row.label, value, sign: v > 0 ? "pos" : "neg" });
  }
  return out;
}

/** Held-item stat lines at a grade — always exact, never rounded. */
export function heldItemStatLines(stats: Partial<StatBlock>): StatLine[] {
  return statLines(stats, false, true);
}
