export const EQUIPPED_STATS_VIEW_KEY = "unite-build-optimizer.equippedStats.v2";

export type EquippedStatsView = "sets" | "flats";

/**
 * Last Equipped Stats tab. Missing or unknown values (new user, or first load
 * after this persist version) return Flats. A later "sets" or "flats" write is
 * remembered.
 */
export function readEquippedStatsView(getItem?: (key: string) => string | null): EquippedStatsView {
  try {
    const raw = (getItem ?? ((key) => localStorage.getItem(key)))(EQUIPPED_STATS_VIEW_KEY);
    return raw === "sets" ? "sets" : "flats";
  } catch {
    return "flats";
  }
}
