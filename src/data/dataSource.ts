// Remote, update-able game data — decoupled from the binary.
//
// The app ships with a bundled patch JSON (offline baseline). At launch it
// checks a remote manifest; if the published data has a newer `version` (the
// bundle's `lastUpdated`, which changes on every regeneration), it downloads +
// validates + caches it, applied on the next load. A new game patch then
// reaches every installed copy by publishing one JSON — no app rebuild.
//
// The blob lives in IndexedDB (see dataCacheStore.ts), not localStorage — the
// ~2.4M-char JSON would crowd out trainer data on iPhone's ~5 MB quota.
//
// Publish target (override with VITE_DATA_BASE_URL at build time):
//   <base>/manifest.json -> { "version": "2026-06-20", "patchVersion": "1.24.0.0", "url": "<base>/patch-1.24.0.0.json" }
//   <base>/patch-x.y.z.json -> a full GameDataBundle

import { PAGES_DATA_BASE } from "../ui/brand";
import { loadBundle } from "./loadBundle";
import {
  type CacheEntry,
  clearDataCache as clearHydratedCache,
  getHydratedCache,
  writeDataCache,
} from "./dataCacheStore";

const DATA_BASE = (import.meta.env.VITE_DATA_BASE_URL as string | undefined) ?? PAGES_DATA_BASE;
const MANIFEST_URL = `${DATA_BASE}/manifest.json`;

function readCache(): CacheEntry | null {
  return getHydratedCache();
}

/** The cached remote bundle's raw JSON (or null) — preferred over the bundled copy. */
export function loadCachedRaw(): unknown | null {
  return readCache()?.raw ?? null;
}

/**
 * The raw bundle the app should load: the cached remote copy when it is
 * strictly newer than the build-time baseline, otherwise the baseline.
 * `version` and `lastUpdated` are ISO dates, so string compare = date compare.
 * Clears a non-newer cache so a freshly shipped app build always wins.
 */
export function activeRaw(baseline: { lastUpdated?: string }): unknown {
  const cache = readCache();
  if (cache && typeof cache.version === "string" && cache.version > (baseline.lastUpdated ?? "")) {
    return cache.raw;
  }
  if (cache) clearDataCache();
  return baseline;
}
export function cachedPatchVersion(): string | null {
  return readCache()?.patchVersion ?? null;
}
export function clearDataCache(): void {
  clearHydratedCache();
}

export interface DataCheckResult {
  status: "updated" | "current" | "offline";
  patchVersion?: string;
}

/**
 * Check the remote manifest; if its `version` is newer than what we already use
 * (cached, else the bundled `currentVersion`), download + validate + cache it.
 * Network/validation failures are swallowed (we keep what we have).
 */
export async function checkDataNow(currentVersion: string): Promise<DataCheckResult> {
  try {
    const m = await fetch(MANIFEST_URL, { cache: "no-store" }).then((r) =>
      r.ok ? r.json() : null,
    );
    if (!m?.version || !m?.url) return { status: "offline" };

    // What the app actually loads today: the cached copy only when it is
    // strictly newer than the bundled baseline (mirrors activeRaw), else the
    // baseline. `version` values are ISO dates, so string compare = date compare.
    const cachedVer = readCache()?.version;
    const effective = cachedVer && cachedVer > currentVersion ? cachedVer : currentVersion;
    if (m.version <= effective)
      return { status: "current", patchVersion: cachedPatchVersion() ?? m.patchVersion };

    const raw = await fetch(m.url, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
    if (!raw) return { status: "offline" };
    loadBundle(raw); // validate against the schema; throws on malformed data
    await writeDataCache({
      version: m.version,
      patchVersion: m.patchVersion ?? "?",
      raw,
      fetchedAt: Date.now(),
    });
    return { status: "updated", patchVersion: m.patchVersion };
  } catch {
    return { status: "offline" };
  }
}

/** Fire-and-forget refresh on startup; calls onUpdate(patchVersion) if a newer bundle was cached. */
export async function refreshDataInBackground(
  currentVersion: string,
  onUpdate?: (patch: string) => void,
): Promise<void> {
  const result = await checkDataNow(currentVersion);
  if (result.status === "updated") onUpdate?.(result.patchVersion ?? "");
}
