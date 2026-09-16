import { activeBonusPercent } from "../engine/emblems";
import { setBonusStat } from "../engine/formulas";
import type { EmblemColor, EmblemSetBonus, StatBlock } from "../types";
import { EMBLEM_SET_INFO } from "./emblemSets";

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

/**
 * Display a reached set bonus. Utility colors (pink/navy/gray) are stored in
 * the bundle as negative HP placeholders — show the real effect and a positive
 * magnitude instead of "−16% HP".
 */
export function formatSetBonus(color: EmblemColor, bonusPercent: number): string {
  const pct = `+${Math.round(Math.abs(bonusPercent) * 100)}%`;
  const info = SET_INFO_BY_COLOR.get(color);
  if (info?.kind === "utility") return `${pct} ${info.label}`;
  const stat = setBonusStat(color);
  const label = (stat && STAT_LABEL[stat]) || info?.label || color;
  return `${pct} ${label}`;
}

/** Footnote list: `brown +4% Atk, pink +16% Tenacity`. */
export function formatActiveSetBonuses(
  bonuses: { color: EmblemColor; bonusPercent: number }[],
): string {
  return bonuses.map((b) => `${b.color} ${formatSetBonus(b.color, b.bonusPercent)}`).join(", ");
}

export interface SetProgressRow {
  color: EmblemColor;
  count: number;
  /** Highest met threshold's bonus, or null if none met yet. */
  met: { threshold: number; bonusPercent: number; stat: keyof StatBlock } | null;
  /** Next threshold above count, or null when the top threshold is met. */
  next: number | null;
}

/** One row per color with count > 0, sorted by count desc (ties: alphabetical
 *  color). Colors with no entry in `bonuses` get met: null, next: null. */
export function setProgressRows(
  counts: Map<EmblemColor, number>,
  bonuses: EmblemSetBonus[],
): SetProgressRow[] {
  const bonusByColor = new Map(bonuses.map((b) => [b.color, b]));

  const rows: SetProgressRow[] = [];
  for (const [color, count] of counts) {
    if (count <= 0) continue;
    const bonus = bonusByColor.get(color);
    if (!bonus) {
      rows.push({ color, count, met: null, next: null });
      continue;
    }

    const thresholds = Object.keys(bonus.thresholds)
      .map(Number)
      .sort((a, b) => a - b);

    const metPercent = activeBonusPercent(count, bonus.thresholds);
    const met =
      metPercent != null
        ? {
            threshold: thresholds.filter((t) => t <= count).pop()!,
            bonusPercent: metPercent,
            stat: bonus.stat,
          }
        : null;

    const next = thresholds.find((t) => t > count) ?? null;

    rows.push({ color, count, met, next });
  }

  rows.sort((a, b) => b.count - a.count || a.color.localeCompare(b.color));
  return rows;
}
