import type { EmblemGrade } from "../types";
import {
  decodeLoadout,
  emptyLoadout,
  isEmblemGrade,
  MAX_EMBLEMS,
  ownedKey,
  sanitizeLoadout,
  type EmblemPick,
  type Loadout,
} from "./loadout";

export type ShareResolver = {
  emblemIdForDex(dex: number): string | null;
  dexForEmblemId(id: string): number;
};

export type ShareHash =
  | { kind: "loadout"; loadout: Loadout }
  | { kind: "emblems"; picks: EmblemPick[] }
  | { kind: "owned"; owned: Set<string> };

const LOADOUT_KEYS = ["p", "lv", "h", "t", "m", "e", "x"] as const;
const GRADE_LETTER: Record<EmblemGrade, string> = {
  bronze: "b",
  silver: "s",
  gold: "g",
  platinum: "p",
};
const LETTER_GRADE: Record<string, EmblemGrade> = {
  b: "bronze",
  s: "silver",
  g: "gold",
  p: "platinum",
};
const DEX_MAX = 1024;
const OWNED_BYTES = (DEX_MAX * 4) / 8;
const TOKEN_RE = /^(\d+)([bsgp])$/i;

function dexFromEmblemId(id: string): number | null {
  const m = /^(\d+)/.exec(id);
  if (!m) return null;
  const dex = Number(m[1]);
  return Number.isFinite(dex) && dex > 0 ? dex : null;
}

function encodeEmblemTokens(picks: EmblemPick[]): string {
  return picks
    .map((p) => {
      const dex = dexFromEmblemId(p.emblemId);
      if (dex == null) return null;
      return `${dex}${GRADE_LETTER[p.grade]}`;
    })
    .filter((t): t is string => t != null)
    .join(".");
}

function decodeEmblemTokens(raw: string, r: ShareResolver): EmblemPick[] {
  const picks: EmblemPick[] = [];
  if (!raw) return picks;
  for (const token of raw.split(".")) {
    const m = TOKEN_RE.exec(token);
    if (!m) continue;
    const grade = LETTER_GRADE[m[2].toLowerCase()];
    if (!grade) continue;
    const id = r.emblemIdForDex(Number(m[1]));
    if (!id) continue;
    picks.push({ emblemId: id, grade });
    if (picks.length >= MAX_EMBLEMS) break;
  }
  return picks;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array | null {
  if (!s) return new Uint8Array(OWNED_BYTES);
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function gradeBit(grade: EmblemGrade): number {
  return { bronze: 0, silver: 1, gold: 2, platinum: 3 }[grade];
}

const BIT_GRADE: EmblemGrade[] = ["bronze", "silver", "gold", "platinum"];

export function encodeLoadoutLink(loadout: Loadout): string {
  const params = new URLSearchParams();
  if (loadout.pokemonId) params.set("p", loadout.pokemonId);
  params.set("lv", String(loadout.level));
  if (loadout.heldItemIds.some(Boolean)) {
    params.set("h", loadout.heldItemIds.map((id) => id ?? "").join("."));
  }
  if (loadout.battleItemId) params.set("t", loadout.battleItemId);
  if (loadout.move1Id || loadout.move2Id) {
    params.set("m", `${loadout.move1Id ?? ""}.${loadout.move2Id ?? ""}`);
  }
  if (loadout.emblems.length) params.set("e", encodeEmblemTokens(loadout.emblems));
  if (loadout.activeBoostIds.length) params.set("x", loadout.activeBoostIds.join("."));
  return params.toString();
}

export function decodeLoadoutLink(params: URLSearchParams, r: ShareResolver): Loadout | null {
  if (!LOADOUT_KEYS.some((k) => params.has(k))) return null;
  const heldRaw = params.get("h");
  const moveRaw = params.get("m");
  const [move1, move2] = moveRaw != null ? moveRaw.split(".") : [undefined, undefined];
  const lvRaw = params.get("lv");
  return sanitizeLoadout({
    pokemonId: params.get("p") || null,
    level: lvRaw != null && lvRaw !== "" ? Number(lvRaw) : 15,
    heldItemIds: heldRaw != null ? heldRaw.split(".").map((id) => id || null) : [null, null, null],
    battleItemId: params.get("t") || null,
    move1Id: move1 || null,
    move2Id: move2 || null,
    emblems: decodeEmblemTokens(params.get("e") ?? "", r),
    activeBoostIds: params.has("x") ? (params.get("x") ?? "").split(".").filter(Boolean) : [],
  });
}

export function encodeEmblemsLink(picks: EmblemPick[]): string {
  return `e=${encodeEmblemTokens(picks)}`;
}

export function decodeEmblemsLink(params: URLSearchParams, r: ShareResolver): EmblemPick[] | null {
  if (!params.has("e")) return null;
  return decodeEmblemTokens(params.get("e") ?? "", r);
}

export function encodeOwnedLink(owned: Set<string>, r: ShareResolver): string {
  const bytes = new Uint8Array(OWNED_BYTES);
  for (const key of owned) {
    const i = key.lastIndexOf(":");
    if (i <= 0) continue;
    const emblemId = key.slice(0, i);
    const grade = key.slice(i + 1);
    if (!isEmblemGrade(grade)) continue;
    const dex = r.dexForEmblemId(emblemId);
    if (dex < 1 || dex > DEX_MAX) continue;
    const bitIndex = (dex - 1) * 4 + gradeBit(grade);
    bytes[bitIndex >> 3] |= 1 << (bitIndex & 7);
  }
  return `o=${bytesToBase64Url(bytes)}`;
}

export function decodeOwnedLink(params: URLSearchParams, r: ShareResolver): Set<string> | null {
  if (!params.has("o")) return null;
  const bytes = base64UrlToBytes(params.get("o") ?? "");
  if (!bytes) return new Set();
  const owned = new Set<string>();
  for (let dex = 1; dex <= DEX_MAX; dex++) {
    const id = r.emblemIdForDex(dex);
    if (!id) continue;
    for (let g = 0; g < 4; g++) {
      const bitIndex = (dex - 1) * 4 + g;
      if (bitIndex >> 3 >= bytes.length) continue;
      if (bytes[bitIndex >> 3] & (1 << (bitIndex & 7))) {
        owned.add(ownedKey(id, BIT_GRADE[g]));
      }
    }
  }
  return owned;
}

export function readShareHash(hash: string, r: ShareResolver): ShareHash | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  if (params.has("b")) {
    const loadout = decodeLoadout(params.get("b") ?? "");
    return loadout ? { kind: "loadout", loadout } : null;
  }
  if (params.has("o")) {
    return { kind: "owned", owned: decodeOwnedLink(params, r) ?? new Set() };
  }
  if (["p", "lv", "h", "t", "m", "x"].some((k) => params.has(k))) {
    const loadout = decodeLoadoutLink(params, r) ?? emptyLoadout();
    return { kind: "loadout", loadout };
  }
  if (params.has("e")) {
    return { kind: "emblems", picks: decodeEmblemsLink(params, r) ?? [] };
  }
  return null;
}

export function buildShareUrl(query: string): string {
  const origin = typeof location !== "undefined" ? location.origin : "";
  const pathname = typeof location !== "undefined" ? location.pathname : "/";
  return `${origin}${pathname}#${query}`;
}
