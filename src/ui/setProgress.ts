import { setBonusStat } from "../engine/formulas";
import type { EmblemColor, StatBlock } from "../types";
import { EMBLEM_SET_INFO, formatSetMagnitude, formatSetTier, type SetInfoRow } from "./emblemSets";

export const STAT_LABEL: Partial<Record<keyof StatBlock, string>> = {
  attack: "Atk",
  spAttack: "Sp.Atk",
  defense: "Def",
  spDefense: "Sp.Def",
  hp: "HP",
  attackSpeed: "Atk Spd",
  cdr: "CDR",
  moveSpeed: "Move",
};

const SET_INFO_BY_COLOR = new Map(EMBLEM_SET_INFO.map((r) => [r.color, r]));

const SHORT_UTILITY: Partial<Record<EmblemColor, string>> = {
  pink: "hindrance",
  navy: "Unite charge",
  gray: "dmg",
};

/**
 * Display a reached set bonus. Utility colors (pink/navy/gray) are stored in
 * the bundle as negative HP placeholders — show the in-game wording and the
 * row's own sign/unit instead of "−16% HP".
 */
export function formatSetBonus(color: EmblemColor, bonusPercent: number): string {
  const info = SET_INFO_BY_COLOR.get(color);
  if (info?.kind === "utility") {
    const value = Math.round(Math.abs(bonusPercent) * 100);
    return formatSetTier(info, { count: 0, value });
  }
  const pct = `+${Math.round(Math.abs(bonusPercent) * 100)}%`;
  const stat = setBonusStat(color);
  const label = (stat && STAT_LABEL[stat]) || info?.label || color;
  return `${pct} ${label}`;
}

/** Compact Equipped Sets caption: `+4% Atk`, `+12% Move (OOC)`, `−3 dmg`. */
export function formatSetEffectShort(info: SetInfoRow, tier: { value: number }): string {
  const mag = formatSetMagnitude(info, tier.value);
  if (info.kind === "utility") {
    return `${mag} ${SHORT_UTILITY[info.color] ?? info.label}`;
  }
  if (info.color === "yellow") return `${mag} Move (OOC)`;
  const stat = setBonusStat(info.color);
  const label = (stat && STAT_LABEL[stat]) || info.label;
  return `${mag} ${label}`;
}

/** Footnote list: `brown +4% Atk, pink −16% hindrance effect duration`. */
export function formatActiveSetBonuses(
  bonuses: { color: EmblemColor; bonusPercent: number }[],
): string {
  return bonuses.map((b) => `${b.color} ${formatSetBonus(b.color, b.bonusPercent)}`).join(", ");
}
