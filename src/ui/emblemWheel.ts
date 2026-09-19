import type { EmblemLoadoutImpact } from "../engine/emblemSearch/pokemonScore";
import { activeBonusPercent, countColors, MAX_EMBLEM_SLOTS } from "../engine/emblems";
import type {
  Emblem,
  EmblemColor,
  EmblemGrade,
  EmblemSetBonus,
  EmblemSlot,
  StatBlock,
} from "../types";
import { EMBLEM_COLOR_HEX } from "./colors";
import { EMBLEM_SET_INFO, type SetInfoRow } from "./emblemSets";
import { formatDelta, STAT_ROWS, statLines } from "./format";
import { formatSetEffectEquipped, formatSetEffectShort } from "./setProgress";

/** Alpha suffix (hex) for filled wheel-track arcs. `"66"` is ≈ 40 %. */
export const WHEEL_ARC_ALPHA = "66";

export interface WheelGeometry {
  box: number;
  ringInsetPct: number;
  hubInsetPct: number;
  coinPx: number;
  radiusPct: number;
  glyphHangPx: number;
}

/**
 * Emblems-card wheel at design size. Coins are 64 CSS pixels (`h-16`, same as
 * Builds). The rendered dial is `min(100%, box)`; coins and glyph hang scale
 * with that width so SE-class phones do not overlap. CSS uses
 * `WHEEL_COIN_SIZE_PCT` so the scale needs no ResizeObserver.
 */
export const WHEEL_GEOMETRY: WheelGeometry = {
  box: 407,
  ringInsetPct: 6,
  hubInsetPct: 27,
  coinPx: 64,
  radiusPct: 33.5,
  glyphHangPx: 12,
};

export const WHEEL_MIN_NEIGHBOR_GAP_PX = 6;

/** Coin width/height as a percent of the wheel box (64 / 407). */
export const WHEEL_COIN_SIZE_PCT = (WHEEL_GEOMETRY.coinPx / WHEEL_GEOMETRY.box) * 100;

/**
 * Linear scale of coin and glyph hang to a rendered box width. Percent insets
 * stay put. Empty / non-positive widths keep the design size.
 */
export function scaledWheelGeometry(
  renderedBox: number,
  g: WheelGeometry = WHEEL_GEOMETRY,
): WheelGeometry {
  if (!(renderedBox > 0)) return { ...g };
  const k = renderedBox / g.box;
  return {
    ...g,
    box: renderedBox,
    coinPx: g.coinPx * k,
    glyphHangPx: g.glyphHangPx * k,
  };
}

/** Filled emblem slots in pick order. Unknown ids are dropped. */
export function slotsFromPicks(
  picks: { emblemId: string; grade: EmblemGrade }[],
  resolve: (id: string) => Emblem | undefined,
): EmblemSlot[] {
  const slots: EmblemSlot[] = [];
  for (const p of picks) {
    const emblem = resolve(p.emblemId);
    if (emblem) slots.push({ emblem, grade: p.grade });
  }
  return slots;
}

/** Design-size clearances for the 10-slot dial (coins scale with the rendered box). */
export function wheelDesignMetrics(g: WheelGeometry = WHEEL_GEOMETRY) {
  const half = g.box / 2;
  const slotR = (g.radiusPct * g.box) / 100;
  const coinR = g.coinPx / 2;
  const chord = 2 * slotR * Math.sin(Math.PI / MAX_EMBLEM_SLOTS);
  return {
    slotR,
    coinR,
    chord,
    neighborGap: chord - g.coinPx - g.glyphHangPx,
    outerWithGlyph: slotR + coinR + g.glyphHangPx,
    half,
    bandInner: half * (1 - (2 * g.hubInsetPct) / 100),
    bandOuter: half * (1 - (2 * g.ringInsetPct) / 100),
  };
}

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
  /** Bundle threshold percent when a tier is active; null if none reached. */
  bonusPercent: number | null;
  info: SetInfoRow;
}

export interface ImpactRow {
  key: keyof StatBlock;
  label: string;
  delta: string;
  sign: "pos" | "neg";
}

export interface OocGainRow {
  label: string;
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
 * Ten 36° arcs, index 0 centred on 12 o'clock. Filled slots tint the arc with
 * the emblem's first color; empty arcs use the raised-surface token.
 */
export function wheelTrackGradient(
  slots: (EmblemSlot | null)[],
  hex: Record<EmblemColor, string> = EMBLEM_COLOR_HEX,
): string {
  const arc = 360 / MAX_EMBLEM_SLOTS;
  const stops = Array.from({ length: MAX_EMBLEM_SLOTS }, (_, i) => {
    const color = slots[i]?.emblem.colors[0];
    const fill = color ? `${hex[color]}${WHEEL_ARC_ALPHA}` : "var(--color-raise)";
    return `${fill} ${i * arc}deg ${(i + 1) * arc}deg`;
  });
  return `conic-gradient(from -18deg, ${stops.join(", ")})`;
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
    rows.push({
      color: info.color,
      count,
      tiers,
      active,
      next,
      bonusPercent: active != null ? bonusPct : null,
      info,
    });
  }

  rows.sort(
    (a, b) => b.count - a.count || (infoOrder.get(a.color) ?? 0) - (infoOrder.get(b.color) ?? 0),
  );
  return rows;
}

/** Non-zero emblemDelta rows in STAT_ROWS order. Gains only — no before/after totals. */
export function emblemImpactRows(impact: EmblemLoadoutImpact | null): ImpactRow[] {
  if (!impact) return [];
  const rows: ImpactRow[] = [];
  for (const row of STAT_ROWS) {
    const delta = impact.emblemDelta[row.key];
    if (delta == null || delta === 0) continue;
    rows.push({
      key: row.key,
      label: row.label,
      delta: formatDelta(delta, row.kind),
      sign: delta > 0 ? "pos" : "neg",
    });
  }
  return rows;
}

/** Short Equipped Sets caption: active bonus, else count/next threshold. */
export function equippedSetCaption(row: EquippedSetRow): string {
  if (row.active) return formatSetEffectShort(row.info, row.active);
  if (row.next != null) return `${row.count}/${row.next}`;
  return `×${row.count}`;
}

/**
 * Tap/expand copy for a set row: the bonus in force, or that none is
 * reached yet. Does not mention the next threshold.
 */
export function equippedSetDetail(row: EquippedSetRow): string {
  return row.active ? formatSetEffectEquipped(row.info, row.active) : "No set bonus yet";
}

/** Non-zero coin flats in STAT_ROWS order. No color-set % applied. */
export function emblemFlatRows(flats: Partial<StatBlock> | null, precise = false): ImpactRow[] {
  if (!flats) return [];
  return statLines(flats, precise).flatMap((line) =>
    line.sign === "zero"
      ? []
      : [{ key: line.key, label: line.label, delta: line.value, sign: line.sign }],
  );
}

/**
 * Capsule fill width for Equipped Sets. Linear in count / the color's top
 * threshold (6 or 7), matching the in-game bar that grows under the 2/4/6
 * (or 3/5/7) pips. 0 when empty or the max is missing.
 */
export function equippedSetFillPercent(count: number, maxTier: number): number {
  if (maxTier <= 0 || count <= 0) return 0;
  return Math.min(100, (count / maxTier) * 100);
}

/**
 * Extra out-of-combat move speed from a yellow set, vs in-combat with the
 * same emblems. Null when yellow is inactive or the extra is zero.
 */
export function emblemOocMoveGain(impact: EmblemLoadoutImpact | null): OocGainRow | null {
  if (!impact?.oocMoveSpeed) return null;
  const yellow = impact.emblemLoadout.activeSetBonuses.some((b) => b.color === "yellow");
  if (!yellow) return null;
  const gain = impact.oocMoveSpeed - impact.effective.moveSpeed;
  if (gain === 0) return null;
  return {
    label: "Speed (Out of Combat)",
    delta: formatDelta(gain, "int"),
    sign: gain > 0 ? "pos" : "neg",
  };
}
