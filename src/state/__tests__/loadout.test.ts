import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { APP_NAME } from "../../ui/brand";
import {
  emptyLoadout,
  encodeLoadout,
  decodeLoadout,
  loadOwnedEmblems,
  loadoutToFileJSON,
  parseLoadoutFile,
  sanitizeLoadout,
  normalizeLoadout,
  loadoutFileName,
  ownedEmblemsToFileJSON,
  parseOwnedEmblemsFile,
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

  it("remaps legacy key in parseOwnedEmblemsFile with validEmblemIds", () => {
    const valid = new Set(["152-chikorita"]);
    const parsed = parseOwnedEmblemsFile(JSON.stringify(["152-chicorita:gold"]), valid);
    expect(parsed).toEqual(new Set(["152-chikorita:gold"]));
  });

  it("passes through non-legacy keys in parseOwnedEmblemsFile", () => {
    const parsed = parseOwnedEmblemsFile(JSON.stringify(["001-bulbasaur:gold"]));
    expect(parsed).toEqual(new Set(["001-bulbasaur:gold"]));
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

describe("loadout file export/import", () => {
  const sample: Loadout = {
    pokemonId: "lucario",
    level: 13,
    heldItemIds: ["muscle-band", "scope-lens", null],
    battleItemId: "x-attack",
    move1Id: null,
    move2Id: null,
    emblems: [
      { emblemId: "001-bulbasaur", grade: "gold" },
      { emblemId: "004-charmander", grade: "silver" },
    ],
    activeBoostIds: ["x-attack"],
  };

  it("round-trips a loadout through the file wrapper", () => {
    expect(parseLoadoutFile(loadoutToFileJSON(sample))).toEqual(sample);
  });

  it("labels the export with the current app name", () => {
    const parsed = JSON.parse(loadoutToFileJSON(sample)) as { app: string };
    expect(parsed.app).toBe(APP_NAME);
  });

  it("imports a file exported under the previous FoxForge GG app label", () => {
    const legacy = {
      app: "FoxForge GG",
      kind: "foxforge.loadout",
      schemaVersion: 1,
      exportedAt: 0,
      loadout: sample,
    };
    expect(parseLoadoutFile(JSON.stringify(legacy))).toEqual(sample);
  });

  it("accepts a bare loadout object (no wrapper)", () => {
    expect(parseLoadoutFile(JSON.stringify(sample))).toEqual(sample);
  });

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
    expect(parseLoadoutFile(JSON.stringify(raw))?.emblems).toEqual([
      { emblemId: "001-bulbasaur", grade: "gold" },
    ]);
    expect(
      decodeLoadout(
        encodeLoadout({ ...emptyLoadout("pikachu"), emblems: raw.emblems as Loadout["emblems"] }),
      )?.emblems,
    ).toEqual([{ emblemId: "001-bulbasaur", grade: "gold" }]);
  });

  it("rejects non-loadout JSON and junk", () => {
    expect(parseLoadoutFile("{}")).toBeNull();
    expect(parseLoadoutFile("not json")).toBeNull();
    expect(parseLoadoutFile(JSON.stringify({ foo: 1 }))).toBeNull();
  });

  it("builds a filesystem-safe download name", () => {
    expect(loadoutFileName(sample, "Mr. Mime")).toBe("foxforge-mr-mime.json");
    expect(loadoutFileName(emptyLoadout())).toBe("foxforge-build.json");
  });
});

describe("owned-emblem inventory file export/import", () => {
  it("round-trips a sorted array", () => {
    const original = new Set(["004-charmander:silver", "001-bulbasaur:gold"]);
    const json = ownedEmblemsToFileJSON(original);
    expect(json.indexOf("001-bulbasaur:gold")).toBeLessThan(json.indexOf("004-charmander:silver"));
    expect(parseOwnedEmblemsFile(json)).toEqual(original);
  });

  it("accepts all four grades including platinum", () => {
    const parsed = parseOwnedEmblemsFile(JSON.stringify(["pikachu:platinum"]));
    expect(parsed).toEqual(new Set(["pikachu:platinum"]));
  });

  it("returns null for structural errors", () => {
    expect(parseOwnedEmblemsFile("not json")).toBeNull();
    expect(parseOwnedEmblemsFile("{}")).toBeNull();
    expect(parseOwnedEmblemsFile(JSON.stringify({ a: 1 }))).toBeNull();
    expect(parseOwnedEmblemsFile(JSON.stringify(["ok:gold", 5]))).toBeNull();
  });

  it("skips malformed entries silently without nulling the whole file", () => {
    const parsed = parseOwnedEmblemsFile(
      JSON.stringify(["nocolon", ":gold", "x:diamond", "001-bulbasaur:gold"]),
    );
    expect(parsed).toEqual(new Set(["001-bulbasaur:gold"]));
  });

  it("drops unknown emblem IDs when validEmblemIds is supplied", () => {
    const input = JSON.stringify(["001-bulbasaur:gold", "made-up-mon:gold"]);
    const valid = new Set(["001-bulbasaur"]);
    expect(parseOwnedEmblemsFile(input, valid)).toEqual(new Set(["001-bulbasaur:gold"]));
    expect(parseOwnedEmblemsFile(input)).toEqual(
      new Set(["001-bulbasaur:gold", "made-up-mon:gold"]),
    );
  });

  it("deduplicates repeated keys", () => {
    const parsed = parseOwnedEmblemsFile(
      JSON.stringify(["001-bulbasaur:gold", "001-bulbasaur:gold"]),
    );
    expect(parsed).toEqual(new Set(["001-bulbasaur:gold"]));
    expect(parsed?.size).toBe(1);
  });
});
