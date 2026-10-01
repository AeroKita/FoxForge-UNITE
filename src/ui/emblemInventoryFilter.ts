import { emblems } from "../data/gameData";
import type { Emblem, EmblemColor, EmblemGrade, StatBlock } from "../types";
import { STAT_ROWS } from "./format";

/** Positive or negative modifier for an emblem stat filter. Off means either sign. */
export type EmblemStatSign = "pos" | "neg";

export interface EmblemStatFilterOption {
  key: keyof StatBlock;
  label: string;
}

export interface EmblemInventoryFilters {
  query: string;
  color: EmblemColor | "all";
  stat: keyof StatBlock | null;
  sign: EmblemStatSign | null;
}

const GRADES = ["bronze", "silver", "gold"] as const;

function presentStatKeys(): Set<keyof StatBlock> {
  const present = new Set<keyof StatBlock>();
  for (const emblem of emblems) {
    for (const grade of GRADES) {
      const stats = emblem.statsByGrade[grade];
      for (const row of STAT_ROWS) {
        const value = stats[row.key];
        if (value != null && value !== 0) present.add(row.key);
      }
    }
  }
  return present;
}

const presentStats = presentStatKeys();

/**
 * Stat pills for the Emblems inventory, in stat-panel order, limited to stats
 * that actually appear on emblems.
 */
export const EMBLEM_STAT_FILTERS: EmblemStatFilterOption[] = STAT_ROWS.filter((row) =>
  presentStats.has(row.key),
).map((row) => ({ key: row.key, label: row.label }));

/** Clicking the active stat clears it; clicking another stat selects that one. */
export function nextStatSelection(
  current: keyof StatBlock | null,
  clicked: keyof StatBlock,
): keyof StatBlock | null {
  return current === clicked ? null : clicked;
}

/** Clicking the active sign clears it; the other sign replaces it. */
export function nextSignSelection(
  current: EmblemStatSign | null,
  clicked: EmblemStatSign,
): EmblemStatSign | null {
  return current === clicked ? null : clicked;
}

/** True when color, stat, or sign is narrowing the list. Name search is separate. */
export function inventoryFiltersActive(filters: EmblemInventoryFilters): boolean {
  return filters.color !== "all" || filters.stat != null || filters.sign != null;
}

function colorLabel(color: EmblemColor): string {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

function statLabel(stat: keyof StatBlock): string {
  return EMBLEM_STAT_FILTERS.find((row) => row.key === stat)?.label ?? stat;
}

/**
 * Short suffix for the "N shown" line. Null when only the name query (or
 * nothing) is narrowing the list.
 */
export function inventoryFilterCaption(filters: EmblemInventoryFilters): string | null {
  const parts: string[] = [];
  if (filters.stat != null) {
    const label = statLabel(filters.stat);
    if (filters.sign === "pos") parts.push(`+ ${label}`);
    else if (filters.sign === "neg") parts.push(`\u2212 ${label}`);
    else parts.push(label);
  } else if (filters.sign === "pos") parts.push("positive stats");
  else if (filters.sign === "neg") parts.push("negative stats");
  if (filters.color !== "all") parts.push(colorLabel(filters.color));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function statsAtGrade(emblem: Emblem, grade: EmblemGrade): Partial<StatBlock> {
  const key = grade === "platinum" ? "gold" : grade;
  return emblem.statsByGrade[key];
}

function matchesSignedValue(value: number, sign: EmblemStatSign | null): boolean {
  if (value === 0) return false;
  if (sign === "pos") return value > 0;
  if (sign === "neg") return value < 0;
  return true;
}

/** Name, color, and stat/sign filters combine. Stat values come from `grade`. */
export function emblemMatchesInventoryFilters(
  emblem: Emblem,
  grade: EmblemGrade,
  filters: EmblemInventoryFilters,
): boolean {
  if (filters.query && !emblem.pokemonName.toLowerCase().includes(filters.query.toLowerCase())) {
    return false;
  }
  if (filters.color !== "all" && !emblem.colors.includes(filters.color)) return false;
  if (filters.stat == null && filters.sign == null) return true;

  const stats = statsAtGrade(emblem, grade);
  if (filters.stat != null) {
    return matchesSignedValue(stats[filters.stat] ?? 0, filters.sign);
  }
  return Object.values(stats).some(
    (value) => value != null && matchesSignedValue(value, filters.sign),
  );
}

/**
 * Whether one emblem-picker tile stays visible. Stat narrowing is applied by
 * the caller (`passesStat`) only when a stat or sign is selected.
 */
export function emblemPickerTileVisible(input: {
  name: string;
  query: string;
  passesColor: boolean;
  passesOwned: boolean;
  passesGrade: boolean;
  statActive: boolean;
  passesStat: boolean;
}): boolean {
  if (!input.name.toLowerCase().includes(input.query.toLowerCase())) return false;
  if (!input.passesColor || !input.passesOwned || !input.passesGrade) return false;
  if (input.statActive && !input.passesStat) return false;
  return true;
}

/**
 * Count-line suffix for the build emblem picker. Adds owned-only on top of
 * the inventory caption. Null when nothing is narrowing the grid.
 */
export function emblemPickerFilterCaption(filters: {
  color: EmblemColor | "all";
  stat: keyof StatBlock | null;
  sign: EmblemStatSign | null;
  ownedOnly: boolean;
}): string | null {
  const parts: string[] = [];
  const base = inventoryFilterCaption({
    query: "",
    color: filters.color,
    stat: filters.stat,
    sign: filters.sign,
  });
  if (base) parts.push(base);
  if (filters.ownedOnly) parts.push("owned");
  return parts.length > 0 ? parts.join(" · ") : null;
}
