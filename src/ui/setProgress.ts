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
  moveSpeed: "Speed",
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

/** Compact Equipped Sets caption: `+4% Atk`, `+12% Speed (OOC)`, `−3 dmg`. */
export function formatSetEffectShort(info: SetInfoRow, tier: { value: number }): string {
  return `${formatSetMagnitude(info, tier.value)} ${setEffectNoun(info)}`;
}

/**
 * Equipped Sets expand copy. Yellow spells out Out of Combat; other colors
 * stay compact.
 */
export function formatSetEffectEquipped(info: SetInfoRow, tier: { value: number }): string {
  if (info.color === "yellow") {
    return `${formatSetMagnitude(info, tier.value)} ${STAT_LABEL.moveSpeed} (Out of Combat)`;
  }
  return formatSetEffectShort(info, tier);
}

/** Compact noun for a color set, without the signed magnitude. */
export function setEffectNoun(info: SetInfoRow): string {
  if (info.kind === "utility") return SHORT_UTILITY[info.color] ?? info.label;
  if (info.color === "yellow") return `${STAT_LABEL.moveSpeed} (OOC)`;
  const stat = setBonusStat(info.color);
  return (stat && STAT_LABEL[stat]) || info.label;
}

export const COLOR_SET_GUIDE_TITLE = "Color-Set Guide";

const GUIDE_STAT_LABEL: Partial<Record<keyof StatBlock, string>> = {
  attack: "Attack",
  spAttack: "Special Attack",
  defense: "Defense",
  spDefense: "Special Defense",
  hp: "HP",
  attackSpeed: "Basic Attack Speed",
  cdr: "Cooldown Reduction",
  moveSpeed: "Movement Speed",
};

const GUIDE_UTILITY: Partial<Record<EmblemColor, string>> = {
  pink: "Hindrance Effect Duration",
  navy: "Unite Charge Rate",
  gray: "Damage Received",
};

/** Beginner-facing noun for the Color-Set Guide. */
export function guideSetNoun(info: SetInfoRow): string {
  if (info.kind === "utility") return GUIDE_UTILITY[info.color] ?? info.label;
  if (info.color === "yellow") return "Movement Speed (Out of Combat)";
  const stat = setBonusStat(info.color);
  return (stat && GUIDE_STAT_LABEL[stat]) || info.label;
}

export interface EmblemSetGuideRow {
  color: EmblemColor;
  kind: SetInfoRow["kind"];
  noun: string;
  tiers: { count: number; magnitude: string }[];
}

/** All 11 colors for the Color-Set Guide, with beginner nouns and magnitudes. */
export function emblemSetGuideRows(): EmblemSetGuideRow[] {
  return EMBLEM_SET_INFO.map((info) => ({
    color: info.color,
    kind: info.kind,
    noun: guideSetNoun(info),
    tiers: info.tiers.map((t) => ({
      count: t.count,
      magnitude: formatSetMagnitude(info, t.value),
    })),
  }));
}

/** Footnote list: `brown +4% Atk, pink −16% hindrance effect duration`. */
export function formatActiveSetBonuses(
  bonuses: { color: EmblemColor; bonusPercent: number }[],
): string {
  return bonuses.map((b) => `${b.color} ${formatSetBonus(b.color, b.bonusPercent)}`).join(", ");
}
