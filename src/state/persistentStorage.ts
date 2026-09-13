/**
 * Home Screen / installed-PWA display detection and a best-effort request to
 * keep this origin's storage. Neither one is required for trainer data to
 * persist; they only help iOS/Safari treat the origin as a real app.
 */

type StandaloneNavigator = Navigator & { standalone?: boolean };

function mediaStandalone(): boolean {
  const host =
    typeof window !== "undefined"
      ? window
      : (globalThis as typeof globalThis & { matchMedia?: (query: string) => MediaQueryList });
  try {
    return Boolean(host.matchMedia?.("(display-mode: standalone)")?.matches);
  } catch {
    return false;
  }
}

/**
 * True when this document is running as an installed / Home Screen web app.
 */
export function isStandaloneDisplay(): boolean {
  if (mediaStandalone()) return true;
  try {
    return Boolean((navigator as StandaloneNavigator).standalone);
  } catch {
    return false;
  }
}

/**
 * Ask the browser to keep this origin's storage. Returns whether persistence
 * was granted. Missing APIs and rejections are `false`, not thrown.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    const persist = navigator.storage?.persist;
    if (typeof persist !== "function") return false;
    return await persist.call(navigator.storage);
  } catch {
    return false;
  }
}
