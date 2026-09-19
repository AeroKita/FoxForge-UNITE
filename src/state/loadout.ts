// Loadout model + localStorage persistence (up to 20 saved loadouts).
// A loadout fully describes a build: Pokémon, level, 3 held items, 1 battle
// item, an emblem set, and which active effects are toggled on.

import type { EmblemGrade } from "../types";
import { generateId } from "../utils/generateId";

export interface EmblemPick {
  emblemId: string;
  grade: EmblemGrade;
}

export interface Loadout {
  pokemonId: string | null;
  level: number; // 1-15
  heldItemIds: (string | null)[]; // exactly 3 slots
  battleItemId: string | null;
  move1Id: string | null; // chosen final (upgrade) move for slot 1; null → derived default
  move2Id: string | null; // chosen final (upgrade) move for slot 2; null → derived default
  emblems: EmblemPick[]; // up to 10
  activeBoostIds: string[]; // toggled-on active effects (default: none)
}

export interface SavedLoadout extends Loadout {
  id: string;
  name: string;
  savedAt: number;
}

export const MAX_HELD_ITEMS = 3;
export const MAX_EMBLEMS = 10;
export const MAX_SAVED_LOADOUTS = 20;
const STORAGE_KEY = "unite-build-optimizer.loadouts.v1";
const CURRENT_KEY = "unite-build-optimizer.current.v1";
const OWNED_KEY = "unite-build-optimizer.ownedEmblems.v2"; // v2: keyed by emblemId:grade

/**
 * Emblem ids that were renamed when upstream spelling errors were fixed
 * (see SPELLING_FIXES in tools/community/normalize.py). Remapped on every
 * load path so pre-rename localStorage data keeps working.
 */
const LEGACY_EMBLEM_ID_REMAP: Record<string, string> = {
  "152-chicorita": "152-chikorita",
};

const LEGACY_POKEMON_ID_REMAP: Record<string, string> = {
  raichu: "alolan-raichu",
  ninetales: "alolan-ninetales",
  rapidash: "galarian-rapidash",
};

function remapEmblemId(emblemId: string): string {
  return LEGACY_EMBLEM_ID_REMAP[emblemId] ?? emblemId;
}

function remapPokemonId(pokemonId: string): string {
  return LEGACY_POKEMON_ID_REMAP[pokemonId] ?? pokemonId;
}

/** Remap legacy emblemId prefixes in owned-key strings (`emblemId:grade`). */
function remapOwnedKey(key: string): string {
  for (const [oldId, newId] of Object.entries(LEGACY_EMBLEM_ID_REMAP)) {
    if (key.startsWith(`${oldId}:`)) {
      return `${newId}:${key.slice(oldId.length + 1)}`;
    }
  }
  return key;
}

export function emptyLoadout(pokemonId: string | null = null): Loadout {
  return {
    pokemonId,
    level: 15,
    heldItemIds: [null, null, null],
    battleItemId: null,
    move1Id: null,
    move2Id: null,
    emblems: [],
    activeBoostIds: [],
  };
}

export function loadSavedLoadouts(): SavedLoadout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => sanitizeSavedLoadout(entry))
      .filter((l): l is SavedLoadout => l !== null);
  } catch {
    return [];
  }
}

function persist(list: SavedLoadout[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Save a loadout (new or overwrite by id). Enforces the 20-loadout cap. */
export function saveLoadout(
  current: SavedLoadout[],
  loadout: Loadout,
  name: string,
  id?: string,
): SavedLoadout[] {
  const now = Date.now();
  if (id) {
    const next = current.map((l) => (l.id === id ? { ...loadout, id, name, savedAt: now } : l));
    persist(next);
    return next;
  }
  if (current.length >= MAX_SAVED_LOADOUTS) {
    throw new Error(`Loadout limit reached (${MAX_SAVED_LOADOUTS}). Delete one first.`);
  }
  const entry: SavedLoadout = { ...loadout, id: generateId(), name, savedAt: now };
  const next = [...current, entry];
  persist(next);
  return next;
}

export function deleteLoadout(current: SavedLoadout[], id: string): SavedLoadout[] {
  const next = current.filter((l) => l.id !== id);
  persist(next);
  return next;
}

/** Strip the saved-metadata fields back to a plain editable Loadout. */
export function toLoadout(saved: SavedLoadout): Loadout {
  return normalizeLoadout(saved);
}

// ----- Current (in-progress) build persistence ------------------------------

export function saveCurrent(loadout: Loadout): void {
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(loadout));
  } catch {
    /* quota */
  }
}
export function loadCurrent(): Loadout | null {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (!raw) return null;
    return normalizeLoadout(JSON.parse(raw));
  } catch {
    return null;
  }
}

// ----- Shareable build links (base64 in the URL hash) -----------------------

export function encodeLoadout(loadout: Loadout): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(loadout))));
}
export function decodeLoadout(encoded: string): Loadout | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return sanitizeLoadout(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Coerce arbitrary parsed JSON into a valid Loadout, or null if unusable. */
export function sanitizeLoadout(x: unknown): Loadout | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (!Array.isArray(o.heldItemIds) || !Array.isArray(o.emblems)) return null;
  const held: (string | null)[] = [0, 1, 2].map((i) => {
    const v = (o.heldItemIds as unknown[])[i];
    return typeof v === "string" ? v : null;
  });
  const emblems: EmblemPick[] = (o.emblems as unknown[])
    .filter((e): e is EmblemPick => {
      const p = e as Record<string, unknown>;
      return (
        !!p &&
        typeof p.emblemId === "string" &&
        typeof p.grade === "string" &&
        isEmblemGrade(p.grade)
      );
    })
    .slice(0, MAX_EMBLEMS)
    .map((e) => ({ emblemId: remapEmblemId(e.emblemId), grade: e.grade }));
  return {
    pokemonId: typeof o.pokemonId === "string" ? remapPokemonId(o.pokemonId) : null,
    level: typeof o.level === "number" ? Math.max(1, Math.min(15, Math.round(o.level))) : 15,
    heldItemIds: held,
    battleItemId: typeof o.battleItemId === "string" ? o.battleItemId : null,
    move1Id: typeof o.move1Id === "string" ? o.move1Id : null,
    move2Id: typeof o.move2Id === "string" ? o.move2Id : null,
    emblems,
    activeBoostIds: Array.isArray(o.activeBoostIds)
      ? (o.activeBoostIds as unknown[]).filter((b): b is string => typeof b === "string")
      : [],
  };
}

function sanitizeSavedLoadout(x: unknown): SavedLoadout | null {
  const loadout = sanitizeLoadout(x);
  if (!loadout) return null;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  return {
    ...loadout,
    id: o.id,
    name: o.name,
    savedAt: typeof o.savedAt === "number" ? o.savedAt : Date.now(),
  };
}

/** Coerce persisted/shared/partial loadouts into a valid in-memory Loadout. */
export function normalizeLoadout(x: unknown): Loadout {
  return (
    sanitizeLoadout(x) ??
    emptyLoadout(
      x && typeof x === "object" && typeof (x as Record<string, unknown>).pokemonId === "string"
        ? remapPokemonId((x as Record<string, unknown>).pokemonId as string)
        : null,
    )
  );
}

// ----- Owned-emblem inventory (local; no account) ---------------------------

/** Composite key for owning a specific grade of an emblem (independent grades). */
export function ownedKey(emblemId: string, grade: EmblemGrade): string {
  return `${emblemId}:${grade}`;
}

export function loadOwnedEmblems(): Set<string> {
  try {
    const raw = localStorage.getItem(OWNED_KEY);
    const keys: string[] = raw ? JSON.parse(raw) : [];
    return new Set(keys.map(remapOwnedKey));
  } catch {
    return new Set();
  }
}
export function saveOwnedEmblems(owned: Set<string>): void {
  try {
    localStorage.setItem(OWNED_KEY, JSON.stringify([...owned]));
  } catch {
    /* quota */
  }
}

export const VALID_GRADES: ReadonlySet<string> = new Set(["bronze", "silver", "gold", "platinum"]);

export function isEmblemGrade(grade: string): grade is EmblemGrade {
  return VALID_GRADES.has(grade);
}
