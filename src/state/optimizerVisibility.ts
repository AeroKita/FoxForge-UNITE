/**
 * Owned inventory the Optimize tab may derive from.
 * While the tab is hidden, keep the snapshot from the last visible render so
 * emblem star taps do not rebuild the search pool or re-run color-count DP.
 */
export function ownedForOptimizer<T>(active: boolean, live: T, shown: T): T {
  return active ? live : shown;
}
