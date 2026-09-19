import type { EmblemPick, Loadout } from "./loadout";

export type ShareResolver = {
  emblemIdForDex(dex: number): string | null;
  dexForEmblemId(id: string): number;
};

export type ShareHash =
  | { kind: "loadout"; loadout: Loadout }
  | { kind: "emblems"; picks: EmblemPick[] }
  | { kind: "owned"; owned: Set<string> };

/** Readable loadout query. Stub until Part 4. */
export function encodeLoadoutLink(_loadout: Loadout): string {
  return "";
}

export function decodeLoadoutLink(_params: URLSearchParams, _r: ShareResolver): Loadout | null {
  return null;
}

export function encodeEmblemsLink(_picks: EmblemPick[]): string {
  return "";
}

export function decodeEmblemsLink(
  _params: URLSearchParams,
  _r: ShareResolver,
): EmblemPick[] | null {
  return null;
}

export function encodeOwnedLink(_owned: Set<string>, _r: ShareResolver): string {
  return "o=";
}

export function decodeOwnedLink(_params: URLSearchParams, _r: ShareResolver): Set<string> | null {
  return null;
}

export function readShareHash(_hash: string, _r: ShareResolver): ShareHash | null {
  return null;
}

export function buildShareUrl(query: string): string {
  const origin = typeof location !== "undefined" ? location.origin : "";
  const pathname = typeof location !== "undefined" ? location.pathname : "/";
  return `${origin}${pathname}#${query}`;
}
