// Remote patch-JSON cache: in-memory + IndexedDB, never localStorage.
// localStorage is reserved for trainer data (current loadout, saved builds,
// owned emblems, grades). The patch blob is ~2.4M chars and blows the ~5 MB
// iOS quota.

export const LEGACY_DATA_CACHE_LS_KEY = "unite-build-optimizer.dataCache.v1";

const IDB_NAME = "foxforge-unite";
const IDB_STORE = "dataCache";
const IDB_KEY = "v1";

export interface CacheEntry {
  version: string;
  patchVersion: string;
  raw: unknown;
  fetchedAt: number;
}

let memory: CacheEntry | null = null;

function dropLegacyLs(): void {
  try {
    localStorage.removeItem(LEGACY_DATA_CACHE_LS_KEY);
  } catch {
    /* private mode / missing localStorage */
  }
}

function readLegacyLs(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(LEGACY_DATA_CACHE_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || typeof parsed.version !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function isCacheEntry(value: unknown): value is CacheEntry {
  if (!value || typeof value !== "object") return false;
  const o = value as CacheEntry;
  return typeof o.version === "string" && "raw" in o;
}

/**
 * The hydrated remote patch cache, or null when none is loaded.
 */
export function getHydratedCache(): CacheEntry | null {
  return memory;
}

/**
 * Replace the in-memory cache (tests and hydrate). Does not write IndexedDB.
 */
export function setHydratedCache(entry: CacheEntry | null): void {
  memory = entry;
}

/**
 * Drop the in-memory cache, the legacy localStorage key, and the IndexedDB row.
 */
export function clearDataCache(): void {
  memory = null;
  dropLegacyLs();
  void idbDelete();
}

/**
 * Copy a leftover localStorage patch cache into memory and delete the LS key.
 * Returns the migrated entry, or null when there was nothing to migrate.
 */
export function migrateLegacyLocalStorageCache(): CacheEntry | null {
  const legacy = readLegacyLs();
  if (!legacy) return null;
  memory = legacy;
  dropLegacyLs();
  return legacy;
}

/**
 * Load IndexedDB (or migrate legacy localStorage) into memory. Must finish
 * before `gameData.ts` is imported so `activeRaw` can read synchronously.
 */
export async function hydrateDataCache(): Promise<void> {
  const fromIdb = await idbGet();
  if (fromIdb) {
    memory = fromIdb;
    dropLegacyLs();
    return;
  }
  const migrated = migrateLegacyLocalStorageCache();
  if (migrated) await idbSet(migrated);
}

/**
 * Persist a validated remote bundle to memory + IndexedDB and drop any legacy
 * localStorage copy.
 */
export async function writeDataCache(entry: CacheEntry): Promise<void> {
  memory = entry;
  dropLegacyLs();
  try {
    await idbSet(entry);
  } catch {
    /* private mode / IDB missing */
  }
}

function idbOpen(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
  });
}

async function idbGet(): Promise<CacheEntry | null> {
  try {
    const db = await idbOpen();
    if (!db) return null;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => {
        const value = req.result;
        resolve(isCacheEntry(value) ? value : null);
      };
      req.onerror = () => reject(req.error ?? new Error("indexedDB get failed"));
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

async function idbSet(entry: CacheEntry): Promise<void> {
  const db = await idbOpen();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(entry, IDB_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("indexedDB put failed"));
  });
}

async function idbDelete(): Promise<void> {
  try {
    const db = await idbOpen();
    if (!db) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error("indexedDB delete failed"));
    });
  } catch {
    /* ignore */
  }
}
