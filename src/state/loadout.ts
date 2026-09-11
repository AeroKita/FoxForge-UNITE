// Loadout model + localStorage persistence (up to 20 saved loadouts).
// A loadout fully describes a build: Pokémon, level, 3 held items, 1 trainer
// (battle) item, an emblem set, and which active effects are toggled on.

import type { EmblemGrade } from "../types";
import { APP_NAME } from "../ui/brand";
import { generateId } from "../utils/generateId";

export interface EmblemPick {
  emblemId: string;
  grade: EmblemGrade;
}

export interface Loadout {
  pokemonId: string | null;
  level: number; // 1-15
  heldItemIds: (string | null)[]; // exactly 3 slots
  battleItemId: string | null; // "Trainer Item"
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

/** Read a shared build from the URL hash (#b=...), if present. */
export function loadoutFromUrl(): Loadout | null {
  const m = typeof location !== "undefined" && location.hash.match(/[#&]b=([^&]+)/);
  return m ? decodeLoadout(decodeURIComponent(m[1])) : null;
}

/** Build a shareable URL encoding the given loadout. */
export function shareUrlFor(loadout: Loadout): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#b=${encodeURIComponent(encodeLoadout(loadout))}`;
}

// ----- Shareable file export/import (.json) ---------------------------------
// A small versioned wrapper so exported builds stay readable if the loadout
// shape changes later. Import is lenient: it accepts a wrapped export or a bare
// Loadout, and sanitizes the shape (clamps level, 3 held slots, caps emblems).

const FILE_KIND = "foxforge.loadout";
const FILE_SCHEMA_VERSION = 1;

export interface LoadoutFile {
  app: string;
  kind: typeof FILE_KIND;
  schemaVersion: number;
  exportedAt: number;
  loadout: Loadout;
}

/** Serialize the current loadout into a shareable, versioned JSON string. */
export function loadoutToFileJSON(loadout: Loadout): string {
  const payload: LoadoutFile = {
    app: APP_NAME,
    kind: FILE_KIND,
    schemaVersion: FILE_SCHEMA_VERSION,
    exportedAt: Date.now(),
    loadout,
  };
  return JSON.stringify(payload, null, 2);
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

/** Parse an exported file (wrapped or bare) into a Loadout, or null. */
export function parseLoadoutFile(text: string): Loadout | null {
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    const inner = data && typeof data === "object" && "loadout" in data ? data.loadout : data;
    return sanitizeLoadout(inner);
  } catch {
    return null;
  }
}

/** A filesystem-safe download name, e.g. "foxforge-lucario.json". */
export function loadoutFileName(loadout: Loadout, pokemonName?: string): string {
  const slug = (pokemonName ?? loadout.pokemonId ?? "build")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `foxforge-${slug || "build"}.json`;
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

/**
 * Serialize the owned-emblem set to the canonical backup format: a sorted,
 * pretty-printed JSON array of `emblemId:grade` strings. Sorting keeps file
 * diffs stable. This is a direct mirror of what is persisted to localStorage.
 */
export function ownedEmblemsToFileJSON(owned: Set<string>): string {
  return JSON.stringify([...owned].sort(), null, 2);
}

/**
 * Parse a backup file back into an owned-emblem set.
 *
 * Returns `null` for a structurally invalid file (leave the inventory
 * unchanged): not valid JSON, top-level value not an array, or any array
 * element not a string. For a structurally valid array, returns a Set of the
 * keys that survive per-entry validation; malformed keys, unknown grades, and
 * (when `validEmblemIds` is supplied) emblem IDs not in the current patch are
 * dropped silently. The Set deduplicates automatically.
 */
export function parseOwnedEmblemsFile(
  text: string,
  validEmblemIds?: Set<string>,
): Set<string> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  if (!parsed.every((x) => typeof x === "string")) return null;

  const next = new Set<string>();
  for (const entry of parsed as string[]) {
    const remapped = remapOwnedKey(entry);
    const i = remapped.lastIndexOf(":");
    if (i <= 0) continue; // no colon, or empty emblemId → malformed, skip
    const emblemId = remapped.slice(0, i);
    const grade = remapped.slice(i + 1);
    if (!isEmblemGrade(grade)) continue;
    if (validEmblemIds && !validEmblemIds.has(emblemId)) continue;
    next.add(ownedKey(emblemId, grade));
  }
  return next;
}
