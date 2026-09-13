import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bundled from "../patch-current.json";
import {
  LEGACY_DATA_CACHE_LS_KEY,
  clearDataCache,
  getHydratedCache,
  migrateLegacyLocalStorageCache,
  setHydratedCache,
  writeDataCache,
} from "../dataCacheStore";

function mockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  });
  return store;
}

const newerEntry = {
  version: "2099-01-01",
  patchVersion: "9.99.9.9",
  raw: { patchVersion: "9.99.9.9" },
  fetchedAt: 1,
};

describe("data cache store", () => {
  beforeEach(() => {
    mockLocalStorage();
    setHydratedCache(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setHydratedCache(null);
  });

  it("activeRaw returns baseline when nothing is hydrated", async () => {
    const { activeRaw } = await import("../dataSource");
    expect(activeRaw(bundled)).toBe(bundled);
  });

  it("activeRaw returns hydrated raw when its version is newer than baseline", async () => {
    setHydratedCache(newerEntry);
    const { activeRaw } = await import("../dataSource");
    const result = activeRaw(bundled) as { patchVersion: string };
    expect(result.patchVersion).toBe("9.99.9.9");
  });

  it("activeRaw clears a stale hydrate and returns baseline", async () => {
    setHydratedCache({
      version: "2000-01-01",
      patchVersion: "1.0.0.0",
      raw: { stale: true },
      fetchedAt: 1,
    });
    const { activeRaw } = await import("../dataSource");
    expect(activeRaw(bundled)).toBe(bundled);
    expect(getHydratedCache()).toBeNull();
  });

  it("migrates a leftover localStorage cache into memory and deletes the key", () => {
    const store = mockLocalStorage();
    store.set(LEGACY_DATA_CACHE_LS_KEY, JSON.stringify(newerEntry));
    const migrated = migrateLegacyLocalStorageCache();
    expect(migrated).toEqual(newerEntry);
    expect(getHydratedCache()).toEqual(newerEntry);
    expect(store.has(LEGACY_DATA_CACHE_LS_KEY)).toBe(false);
  });

  it("migrate is a no-op when localStorage has no legacy key", () => {
    const store = mockLocalStorage();
    expect(migrateLegacyLocalStorageCache()).toBeNull();
    expect(getHydratedCache()).toBeNull();
    expect(store.has(LEGACY_DATA_CACHE_LS_KEY)).toBe(false);
  });

  it("writeDataCache updates memory and does not write the legacy localStorage key", async () => {
    const store = mockLocalStorage();
    await writeDataCache(newerEntry);
    expect(getHydratedCache()).toEqual(newerEntry);
    expect(store.has(LEGACY_DATA_CACHE_LS_KEY)).toBe(false);
    clearDataCache();
    expect(getHydratedCache()).toBeNull();
  });
});
