/** Which Builds-card source and variant the trainer last had open. */

export const BUILD_VIEW_KEY = "unite-build-optimizer.buildView.v1";

export const BUILD_VIEW_TABS = ["recommended", "creative"] as const;
export type BuildViewTab = (typeof BUILD_VIEW_TABS)[number];

export interface BuildView {
  pokemonId: string;
  tab: BuildViewTab;
  idxByTab: Record<BuildViewTab, number>;
}

/**
 * Recommended build 1 for `pokemonId`. Used when nothing valid is stored
 * for that Pokémon.
 */
export function defaultBuildView(pokemonId: string): BuildView {
  return {
    pokemonId,
    tab: "recommended",
    idxByTab: { recommended: 0, creative: 0 },
  };
}

function isBuildViewTab(value: unknown): value is BuildViewTab {
  return value === "recommended" || value === "creative";
}

/** Non-negative integer. Floats and negatives are rejected, not coerced. */
function isBuildIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Accept a stored object only when every field matches {@link BuildView}.
 * Returns null for junk so callers fall back to {@link defaultBuildView}.
 */
export function parseBuildView(raw: unknown): BuildView | null {
  if (!raw || typeof raw !== "object") return null;
  const view = raw as Partial<BuildView>;
  const idx = view.idxByTab;
  if (typeof view.pokemonId !== "string" || view.pokemonId.length === 0) return null;
  if (!isBuildViewTab(view.tab)) return null;
  if (!idx || typeof idx !== "object") return null;
  if (!isBuildIndex(idx.recommended) || !isBuildIndex(idx.creative)) return null;
  return {
    pokemonId: view.pokemonId,
    tab: view.tab,
    idxByTab: { recommended: idx.recommended, creative: idx.creative },
  };
}

/**
 * Keep `stored` when it belongs to `pokemonId`. Otherwise start at
 * Recommended build 1 for `pokemonId`.
 */
export function buildViewForPokemon(stored: BuildView | null, pokemonId: string): BuildView {
  if (!stored || stored.pokemonId !== pokemonId) return defaultBuildView(pokemonId);
  return stored;
}

/**
 * Read {@link BUILD_VIEW_KEY} and return the view for `pokemonId`.
 * Missing, junk, another Pokémon, or a throwing getter yields the default.
 */
export function loadBuildView(
  pokemonId: string,
  getItem: (key: string) => string | null = (key) => localStorage.getItem(key),
): BuildView {
  try {
    const raw = getItem(BUILD_VIEW_KEY);
    if (!raw) return defaultBuildView(pokemonId);
    return buildViewForPokemon(parseBuildView(JSON.parse(raw)), pokemonId);
  } catch {
    return defaultBuildView(pokemonId);
  }
}

/**
 * Write `view` to {@link BUILD_VIEW_KEY}. A throwing setter is ignored
 * (private mode / quota).
 */
export function saveBuildView(
  view: BuildView,
  setItem: (key: string, value: string) => void = (key, value) => localStorage.setItem(key, value),
): void {
  try {
    setItem(BUILD_VIEW_KEY, JSON.stringify(view));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Index into a build list. Empty lists stay at 0; others clamp into range.
 */
export function clampedBuildIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}
