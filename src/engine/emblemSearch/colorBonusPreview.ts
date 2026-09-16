/**
 * Proposed color set-bonus preview.
 *
 * Given a map of per-color emblem counts and the game's EmblemSetBonus table,
 * computes which bonus tiers would be achieved and at what percent. Used to
 * give the user a live preview of the bonuses their color target would unlock.
 *
 * Mirrors the bonus-preview logic in updateColorTargetSummary / colorBonusScore
 * in uniteemblemfinder.github.io/src/app.js (clean-room TypeScript port; no code
 * copied verbatim).
 */

import type { EmblemColor, EmblemSetBonus, StatBlock } from "../../types";
import { setBonusStat } from "../formulas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColorBonusPreviewItem {
  color: EmblemColor;
  /** The entered count for this color. */
  count: number;
  /** Which stat the bonus applies to. Placeholder HP for utility sets — unused in UI. */
  stat: keyof StatBlock;
  /**
   * Bonus fraction, e.g. 0.04 for a 4% bonus.
   * For PERCENT_POINT_STATS (cdr, attackSpeed) this is an additive delta on the
   * percent-domain value; for all other stats it is a multiplier applied to
   * (base + flat emblems). Utility sets use the absolute magnitude of the
   * bundle's placeholder (pink −16% → 0.16).
   */
  percent: number;
  /** 1-based tier number (tier 1 = lowest threshold, tier 3 = highest). */
  tier: number;
  /**
   * True when the bonus is a percentage-point addition (cdr, attackSpeed) rather
   * than a multiplicative % of base. Affects how the concrete delta is displayed.
   */
  percentPoint: boolean;
  /**
   * Utility sets (pink/navy/gray) do not scale a StatBlock field — preview the
   * effect name instead of an HP/Atk approximation.
   */
  kind: "stat" | "utility";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Stats that receive percentage-point additive bonuses (not base-multiplied).
 * Mirrors PERCENT_POINT_STATS in formulas.ts (not exported from there).
 */
const PERCENT_POINT_STATS: ReadonlySet<keyof StatBlock> = new Set(["attackSpeed", "cdr"] as const);

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Compute which color set-bonus tiers would be achieved given per-color counts.
 *
 * - Stat-set colors with a positive threshold are returned as `kind: "stat"`.
 * - Utility colors (pink/navy/gray; `setBonusStat` is null) are returned as
 *   `kind: "utility"` with `percent` as the absolute magnitude.
 * - Mirrors `colorBonusScore(counts, true).details` from uniteemblemfinder for
 *   stat sets; utility sets are a FoxForge preview addition.
 *
 * The input `colorCounts` uses ALL active colors (checked in the UI), not only
 * the colors with hard constraints. This matches the reference's "preview" which
 * is shown regardless of the exact/weighted toggle.
 */
export function proposedColorBonuses(
  colorCounts: Map<EmblemColor, number>,
  setBonuses: EmblemSetBonus[],
): ColorBonusPreviewItem[] {
  const result: ColorBonusPreviewItem[] = [];

  for (const def of setBonuses) {
    const count = colorCounts.get(def.color) ?? 0;
    if (count === 0) continue;

    // Find the highest threshold met (thresholds are stored as Record<number, number>)
    const thresholds = Object.keys(def.thresholds)
      .map(Number)
      .sort((a, b) => a - b); // ascending

    let tierIdx = -1;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (count >= thresholds[i]) {
        tierIdx = i;
        break;
      }
    }
    if (tierIdx < 0) continue;

    const rawPercent = def.thresholds[thresholds[tierIdx]];
    const utility = setBonusStat(def.color) === null;
    if (!utility && rawPercent <= 0) continue;

    result.push({
      color: def.color,
      count,
      stat: def.stat,
      percent: Math.abs(rawPercent),
      tier: tierIdx + 1, // 1-based, matching uniteemblemfinder's tier display
      percentPoint: !utility && PERCENT_POINT_STATS.has(def.stat),
      kind: utility ? "utility" : "stat",
    });
  }

  return result;
}

/**
 * Estimate the concrete stat delta the bonus would yield for a Pokémon.
 *
 * - Percent-point stats (cdr, attackSpeed): delta = percent (already in
 *   the correct decimal unit, e.g. 0.04 means +4% CDR).
 * - Multiplied stats: delta ≈ baseStat × percent (using base stat only as
 *   an approximation; actual in-game value includes emblem flats too).
 */
export function concreteBonusDelta(item: ColorBonusPreviewItem, baseStat: number): number {
  if (item.percentPoint) return item.percent;
  return baseStat * item.percent;
}

/**
 * Format the bonus percent for display (e.g. "+4% Attack").
 * Uses brief stat labels suitable for compact badge display.
 */
export const BONUS_STAT_LABELS: Partial<Record<keyof StatBlock, string>> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  spAttack: "Sp. Atk",
  spDefense: "Sp. Def",
  attackSpeed: "Atk Spd",
  cdr: "CDR",
  moveSpeed: "Move Spd",
  critRate: "Crit",
  lifesteal: "Lifesteal",
  spLifesteal: "Sp. Lifesteal",
};
