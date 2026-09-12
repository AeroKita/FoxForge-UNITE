/**
 * StatDock live +/- chips. Compare against the first snapshot of an edit
 * window so a grade slider reports the full change, not each tick.
 */

export function retainFlashBaseline<T>(existing: T | null, prevSnapshot: T): T {
  return existing ?? prevSnapshot;
}

export function dockFlashDeltas<K extends string>(
  current: Record<K, number>,
  baseline: Record<K, number>,
  keys: readonly K[],
  epsilon = 1e-9,
): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  for (const k of keys) {
    const d = current[k] - baseline[k];
    if (Math.abs(d) > epsilon) out[k] = d;
  }
  return out;
}
