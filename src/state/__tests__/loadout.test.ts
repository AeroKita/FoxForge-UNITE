import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  emptyLoadout,
  encodeLoadout,
  decodeLoadout,
  loadOwnedEmblems,
  sanitizeLoadout,
  normalizeLoadout,
  type Loadout,
} from "../loadout";

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

describe("legacy Pokémon id remap", () => {
  it("remaps raichu to alolan-raichu in sanitizeLoadout", () => {
    const out = sanitizeLoadout({
      pokemonId: "raichu",
      level: 15,
      heldItemIds: [null, null, null],
      battleItemId: null,
      emblems: [],
      activeBoostIds: [],
    });
    expect(out?.pokemonId).toBe("alolan-raichu");
  });

  it("remaps ninetales and rapidash to regional ids", () => {
    expect(
      sanitizeLoadout({
        pokemonId: "ninetales",
        level: 15,
        heldItemIds: [null, null, null],
        battleItemId: null,
        emblems: [],
        activeBoostIds: [],
      })?.pokemonId,
    ).toBe("alolan-ninetales");
    expect(
      sanitizeLoadout({
        pokemonId: "rapidash",
        level: 15,
        heldItemIds: [null, null, null],
        battleItemId: null,
        emblems: [],
        activeBoostIds: [],
      })?.pokemonId,
    ).toBe("galarian-rapidash");
  });

  it("passes through Pokémon ids that are not regional remaps", () => {
    const out = sanitizeLoadout({
      pokemonId: "pikachu",
      level: 15,
      heldItemIds: [null, null, null],
      battleItemId: null,
      emblems: [],
      activeBoostIds: [],
    });
    expect(out?.pokemonId).toBe("pikachu");
  });
});

describe("legacy emblem id remap", () => {
  beforeEach(() => mockLocalStorage());
  afterEach(() => vi.unstubAllGlobals());
  it("remaps 152-chicorita to 152-chikorita in sanitizeLoadout", () => {
    const out = sanitizeLoadout({
      pokemonId: "pikachu",
      level: 15,
      heldItemIds: [null, null, null],
      battleItemId: null,
      emblems: [{ emblemId: "152-chicorita", grade: "gold" }],
      activeBoostIds: [],
    });
    expect(out?.emblems).toEqual([{ emblemId: "152-chikorita", grade: "gold" }]);
  });

  it("passes through non-legacy emblem ids in sanitizeLoadout", () => {
    const out = sanitizeLoadout({
      pokemonId: "pikachu",
      level: 15,
      heldItemIds: [null, null, null],
      battleItemId: null,
      emblems: [{ emblemId: "001-bulbasaur", grade: "gold" }],
      activeBoostIds: [],
    });
    expect(out?.emblems).toEqual([{ emblemId: "001-bulbasaur", grade: "gold" }]);
  });

  it("remaps 152-chicorita:gold in loadOwnedEmblems", () => {
    const store = mockLocalStorage();
    store.set("unite-build-optimizer.ownedEmblems.v2", JSON.stringify(["152-chicorita:gold"]));
    expect(loadOwnedEmblems()).toEqual(new Set(["152-chikorita:gold"]));
  });
});

describe("loadout sharing", () => {
  it("round-trips a loadout through encode/decode", () => {
    const l: Loadout = {
      pokemonId: "lucario",
      level: 13,
      heldItemIds: ["muscle-band", "scope-lens", null],
      battleItemId: "x-attack",
      move1Id: "power-up-punch",
      move2Id: "bone-rush",
      emblems: [
        { emblemId: "001-bulbasaur", grade: "gold" },
        { emblemId: "004-charmander", grade: "silver" },
      ],
      activeBoostIds: ["x-attack", "move:Feint"],
    };
    const decoded = decodeLoadout(encodeLoadout(l));
    expect(decoded).toEqual(l);
  });

  it("round-trips the empty loadout", () => {
    const e = emptyLoadout("pikachu");
    expect(decodeLoadout(encodeLoadout(e))).toEqual(e);
  });

  it("returns null on malformed input", () => {
    expect(decodeLoadout("not-valid-base64!!")).toBeNull();
    expect(decodeLoadout(btoa("{}"))).toBeNull(); // valid JSON, wrong shape
  });

  it("accepts a legacy loadout missing the newer fields", () => {
    const legacy = {
      pokemonId: "pikachu",
      level: 15,
      heldItemIds: ["muscle-band", null, null],
      battleItemId: null,
      emblems: [],
      activeBoostIds: [],
    };
    const out = sanitizeLoadout(legacy);
    expect(out?.heldItemIds).toEqual(["muscle-band", null, null]);
    expect(out?.move1Id).toBeNull();
  });
});

describe("sanitizeLoadout", () => {
  it("sanitizes bad shapes: clamps level, 3 held slots, caps emblems", () => {
    const messy = sanitizeLoadout({
      pokemonId: "pikachu",
      level: 99,
      heldItemIds: ["a", "b", "c", "d", 5],
      battleItemId: 42,
      emblems: [...Array(15)].map((_, i) => ({ emblemId: `e${i}`, grade: "gold" })),
      activeBoostIds: ["ok", 3, null],
    });
    expect(messy?.level).toBe(15);
    expect(messy?.heldItemIds).toEqual(["a", "b", "c"]);
    expect(messy?.battleItemId).toBeNull();
    expect(messy?.emblems).toHaveLength(10);
    expect(messy?.activeBoostIds).toEqual(["ok"]);
  });

  it("drops emblem picks whose grade is not bronze/silver/gold/platinum", () => {
    const raw = {
      pokemonId: "pikachu",
      level: 15,
      heldItemIds: [null, null, null],
      battleItemId: null,
      emblems: [
        { emblemId: "pikachu", grade: "diamond" },
        { emblemId: "001-bulbasaur", grade: "gold" },
      ],
      activeBoostIds: [],
    };
    expect(sanitizeLoadout(raw)?.emblems).toEqual([{ emblemId: "001-bulbasaur", grade: "gold" }]);
    expect(normalizeLoadout(raw).emblems).toEqual([{ emblemId: "001-bulbasaur", grade: "gold" }]);
    expect(
      decodeLoadout(
        encodeLoadout({ ...emptyLoadout("pikachu"), emblems: raw.emblems as Loadout["emblems"] }),
      )?.emblems,
    ).toEqual([{ emblemId: "001-bulbasaur", grade: "gold" }]);
  });
});
