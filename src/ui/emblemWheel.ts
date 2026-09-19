import type { EmblemLoadoutImpact } from "../engine/emblemSearch/pokemonScore";
import { activeBonusPercent, countColors, MAX_EMBLEM_SLOTS } from "../engine/emblems";
import type { EmblemColor, EmblemSetBonus, EmblemSlot, StatBlock } from "../types";
import { EMBLEM_SET_INFO, type SetInfoRow } from "./emblemSets";
import { formatDelta, formatStat, STAT_ROWS } from "./format";

export interface WheelPosition {
  left: number;
  top: number;
}

export interface EquippedSetRow {
  color: EmblemColor;
  count: number;
  tiers: { count: number; value: number; reached: boolean }[];
  active: { count: number; value: number } | null;
  next: number | null;
  info: SetInfoRow;
}

export interface ImpactRow {
  key: keyof StatBlock;
  label: string;
  before: string;
  after: string;
  delta: string;
  sign: "pos" | "neg";
}

/** Index 0 at 12 o'clock, clockwise. Center is (50, 50) percent of the box. */
export function wheelSlotPositions(count = MAX_EMBLEM_SLOTS, radiusPct = 42): WheelPosition[] {
  return Array.from({ length: count }, (_, i) => {
    const theta = (i / count) * 2 * Math.PI;
    return {
      left: 50 + radiusPct * Math.sin(theta),
      top: 50 - radiusPct * Math.cos(theta),
    };
  });
}

/**
 * Colors with count > 0, sorted by count desc, then EMBLEM_SET_INFO order.
 * Dual-color emblems count toward both colors (via countColors).
 */
export function equippedSetRows(
  slots: EmblemSlot[],
  setBonuses: EmblemSetBonus[],
): EquippedSetRow[] {
  const counts = countColors(slots);
  const bonusByColor = new Map(setBonuses.map((b) => [b.color, b]));
  const infoOrder = new Map(EMBLEM_SET_INFO.map((row, i) => [row.color, i]));
  const rows: EquippedSetRow[] = [];

  for (const info of EMBLEM_SET_INFO) {
    const count = counts.get(info.color) ?? 0;
    if (count <= 0) continue;
    const def = bonusByColor.get(info.color);
    const bonusPct = def ? activeBonusPercent(count, def.thresholds) : null;
    const tiers = info.tiers.map((t) => ({ ...t, reached: count >= t.count }));
    const reached = info.tiers.filter((t) => count >= t.count);
    const active = bonusPct != null && reached.length > 0 ? reached[reached.length - 1]! : null;
    const next = info.tiers.find((t) => t.count > count)?.count ?? null;
    rows.push({ color: info.color, count, tiers, active, next, info });
  }

  rows.sort(
    (a, b) => b.count - a.count || (infoOrder.get(a.color) ?? 0) - (infoOrder.get(b.color) ?? 0),
  );
  return rows;
}

/** Non-zero emblemDelta rows in STAT_ROWS order. before = effective − delta. */
export function emblemImpactRows(impact: EmblemLoadoutImpact | null): ImpactRow[] {
  if (!impact) return [];
  const rows: ImpactRow[] = [];
  for (const row of STAT_ROWS) {
    const delta = impact.emblemDelta[row.key];
    if (delta == null || delta === 0) continue;
    const after = impact.effective[row.key];
    const before = after - delta;
    rows.push({
      key: row.key,
      label: row.label,
      before: formatStat(before, row.kind),
      after: formatStat(after, row.kind),
      delta: formatDelta(delta, row.kind),
      sign: delta > 0 ? "pos" : "neg",
    });
  }
  return rows;
}
