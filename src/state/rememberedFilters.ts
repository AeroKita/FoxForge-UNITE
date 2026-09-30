import { ALL_EMBLEM_COLORS } from "../ui/colors";
import { EMBLEM_STAT_FILTERS, type EmblemStatSign } from "../ui/emblemInventoryFilter";
import type { EmblemColor, StatBlock } from "../types";

/** Last role pill in Choose a Pokémon. Shared by every picker sheet. */
export const POKEMON_PICKER_ROLE_KEY = "unite-build-optimizer.pokemonPickerRole.v1";

/** Last Emblems-page grade and inventory filters. Name search is not stored. */
export const EMBLEM_PAGE_FILTERS_KEY = "unite-build-optimizer.emblemPageFilters.v1";

export const POKEMON_PICKER_ROLES = [
  "All",
  "Attacker",
  "AllRounder",
  "Speedster",
  "Defender",
  "Supporter",
] as const;

export type PokemonPickerRole = (typeof POKEMON_PICKER_ROLES)[number];

export const EMBLEM_PAGE_GRADES = ["bronze", "silver", "gold"] as const;
export type EmblemPageGrade = (typeof EMBLEM_PAGE_GRADES)[number];

export interface EmblemPageFilters {
  grade: EmblemPageGrade;
  color: EmblemColor | "all";
  stat: keyof StatBlock | null;
  sign: EmblemStatSign | null;
}

const PICKER_ROLE_SET: ReadonlySet<string> = new Set(POKEMON_PICKER_ROLES);
const PAGE_GRADE_SET: ReadonlySet<string> = new Set(EMBLEM_PAGE_GRADES);
const EMBLEM_COLOR_SET: ReadonlySet<string> = new Set(ALL_EMBLEM_COLORS);
const EMBLEM_STAT_SET: ReadonlySet<string> = new Set(EMBLEM_STAT_FILTERS.map((row) => row.key));

function defaultGet(key: string): string | null {
  return localStorage.getItem(key);
}

function defaultSet(key: string, value: string): void {
  localStorage.setItem(key, value);
}

/**
 * All Pokémon, gold emblems, and no color or stat filter.
 * Used when nothing valid is stored.
 */
export function defaultEmblemPageFilters(): EmblemPageFilters {
  return { grade: "gold", color: "all", stat: null, sign: null };
}

/** Accept a stored role pill. Junk returns null so callers fall back to All. */
export function parsePokemonPickerRole(raw: unknown): PokemonPickerRole | null {
  return typeof raw === "string" && PICKER_ROLE_SET.has(raw) ? (raw as PokemonPickerRole) : null;
}

/**
 * Read {@link POKEMON_PICKER_ROLE_KEY}. Missing, junk, or a throwing getter
 * yields All.
 */
export function loadPokemonPickerRole(
  getItem: (key: string) => string | null = defaultGet,
): PokemonPickerRole {
  try {
    const raw = getItem(POKEMON_PICKER_ROLE_KEY);
    if (!raw) return "All";
    return parsePokemonPickerRole(raw) ?? "All";
  } catch {
    return "All";
  }
}

/**
 * Write `role` to {@link POKEMON_PICKER_ROLE_KEY} and return it.
 * A throwing setter is ignored.
 */
export function commitPokemonPickerRole(
  role: PokemonPickerRole,
  setItem: (key: string, value: string) => void = defaultSet,
): PokemonPickerRole {
  const parsed = parsePokemonPickerRole(role) ?? "All";
  try {
    setItem(POKEMON_PICKER_ROLE_KEY, parsed);
  } catch {
    /* quota / private mode */
  }
  return parsed;
}

function isPageGrade(value: unknown): value is EmblemPageGrade {
  return typeof value === "string" && PAGE_GRADE_SET.has(value);
}

function isPageColor(value: unknown): value is EmblemColor | "all" {
  return value === "all" || (typeof value === "string" && EMBLEM_COLOR_SET.has(value));
}

function isPageStat(value: unknown): value is keyof StatBlock {
  return typeof value === "string" && EMBLEM_STAT_SET.has(value);
}

function isPageSign(value: unknown): value is EmblemStatSign {
  return value === "pos" || value === "neg";
}

/**
 * Accept a stored Emblems-page view. Invalid fields fall back individually.
 * Returns null when `raw` is not a plain object.
 */
export function parseEmblemPageFilters(raw: unknown): EmblemPageFilters | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const view = raw as Partial<EmblemPageFilters>;
  return {
    grade: isPageGrade(view.grade) ? view.grade : "gold",
    color: isPageColor(view.color) ? view.color : "all",
    stat: isPageStat(view.stat) ? view.stat : null,
    sign: isPageSign(view.sign) ? view.sign : null,
  };
}

/**
 * Read {@link EMBLEM_PAGE_FILTERS_KEY}. Missing, junk, or a throwing getter
 * yields {@link defaultEmblemPageFilters}.
 */
export function loadEmblemPageFilters(
  getItem: (key: string) => string | null = defaultGet,
): EmblemPageFilters {
  try {
    const raw = getItem(EMBLEM_PAGE_FILTERS_KEY);
    if (!raw) return defaultEmblemPageFilters();
    return parseEmblemPageFilters(JSON.parse(raw)) ?? defaultEmblemPageFilters();
  } catch {
    return defaultEmblemPageFilters();
  }
}

/**
 * Write `view` to {@link EMBLEM_PAGE_FILTERS_KEY} and return the stored view.
 * A throwing setter is ignored. Invalid fields are repaired before writing.
 */
export function commitEmblemPageFilters(
  view: EmblemPageFilters,
  setItem: (key: string, value: string) => void = defaultSet,
): EmblemPageFilters {
  const parsed = parseEmblemPageFilters(view) ?? defaultEmblemPageFilters();
  try {
    setItem(EMBLEM_PAGE_FILTERS_KEY, JSON.stringify(parsed));
  } catch {
    /* quota / private mode */
  }
  return parsed;
}
