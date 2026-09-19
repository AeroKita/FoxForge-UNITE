import { describe, expect, it } from "vitest";
import { emptyLoadout, encodeLoadout, MAX_EMBLEMS, type Loadout } from "../loadout";
import {
  decodeEmblemsLink,
  decodeLoadoutLink,
  decodeOwnedLink,
  encodeEmblemsLink,
  encodeLoadoutLink,
  encodeOwnedLink,
  readShareHash,
  type ShareResolver,
} from "../shareLink";

const DEX_IDS: [number, string][] = [
  [1, "001-bulbasaur"],
  [6, "006-charizard"],
  [1008, "1008-miraidon"],
];
const byDex = new Map(DEX_IDS);
const byId = new Map(DEX_IDS.map(([dex, id]) => [id, dex]));

const resolver: ShareResolver = {
  emblemIdForDex: (dex) => byDex.get(dex) ?? null,
  dexForEmblemId: (id) => {
    const mapped = byId.get(id);
    if (mapped != null) return mapped;
    const m = /^(\d+)/.exec(id);
    return m ? Number(m[1]) : 0;
  },
};

const fixture: Loadout = {
  pokemonId: "lucario",
  level: 15,
  heldItemIds: ["muscle-band", "attack-weight", "weakness-policy"],
  battleItemId: "eject-button",
  move1Id: "aura-cannon",
  move2Id: "close-combat",
  emblems: [
    { emblemId: "001-bulbasaur", grade: "gold" },
    { emblemId: "006-charizard", grade: "platinum" },
    { emblemId: "1008-miraidon", grade: "silver" },
  ],
  activeBoostIds: ["boost-a"],
};

describe("encodeLoadoutLink", () => {
  it("encodes the fixture loadout as a readable query", () => {
    expect(encodeLoadoutLink(fixture)).toBe(
      "p=lucario&lv=15&h=muscle-band.attack-weight.weakness-policy&t=eject-button&m=aura-cannon.close-combat&e=1g.6p.1008s&x=boost-a",
    );
  });

  it("omits empty fields; emptyLoadout encodes to lv=15", () => {
    expect(encodeLoadoutLink(emptyLoadout())).toBe("lv=15");
  });
});

describe("decodeLoadoutLink", () => {
  it("round-trips the fixture loadout exactly", () => {
    const params = new URLSearchParams(encodeLoadoutLink(fixture));
    expect(decodeLoadoutLink(params, resolver)).toEqual(fixture);
  });

  it("clamps lv to 1–15", () => {
    expect(decodeLoadoutLink(new URLSearchParams("lv=99&p=lucario"), resolver)?.level).toBe(15);
    expect(decodeLoadoutLink(new URLSearchParams("lv=0&p=lucario"), resolver)?.level).toBe(1);
  });

  it("drops emblem tokens with an unknown pokedex or grade letter", () => {
    const params = new URLSearchParams("e=1g.9999g.bad.6x.6p");
    expect(decodeLoadoutLink(params, resolver)?.emblems).toEqual([
      { emblemId: "001-bulbasaur", grade: "gold" },
      { emblemId: "006-charizard", grade: "platinum" },
    ]);
  });

  it("caps emblems at MAX_EMBLEMS", () => {
    const tokens = Array.from({ length: MAX_EMBLEMS + 3 }, () => "1g").join(".");
    const params = new URLSearchParams(`e=${tokens}`);
    expect(decodeLoadoutLink(params, resolver)?.emblems).toHaveLength(MAX_EMBLEMS);
  });

  it("returns null when no recognized key is present", () => {
    expect(decodeLoadoutLink(new URLSearchParams(), resolver)).toBeNull();
    expect(decodeLoadoutLink(new URLSearchParams("foo=bar"), resolver)).toBeNull();
  });
});

describe("emblem-only links", () => {
  it("encodeEmblemsLink / decodeEmblemsLink round-trip and ignore junk tokens", () => {
    const picks = [
      { emblemId: "001-bulbasaur", grade: "gold" as const },
      { emblemId: "006-charizard", grade: "platinum" as const },
    ];
    expect(encodeEmblemsLink(picks)).toBe("e=1g.6p");
    expect(decodeEmblemsLink(new URLSearchParams("e=1g.junk.6p.9999g"), resolver)).toEqual(picks);
  });
});

describe("owned inventory links", () => {
  it("round-trips two owned entries", () => {
    const owned = new Set(["001-bulbasaur:gold", "006-charizard:platinum"]);
    const encoded = encodeOwnedLink(owned, resolver);
    expect(encoded.startsWith("o=")).toBe(true);
    expect(decodeOwnedLink(new URLSearchParams(encoded), resolver)).toEqual(owned);
  });

  it("decodes an empty set to an empty set", () => {
    const encoded = encodeOwnedLink(new Set(), resolver);
    expect(decodeOwnedLink(new URLSearchParams(encoded), resolver)).toEqual(new Set());
  });

  it("survives all four grades", () => {
    const owned = new Set([
      "001-bulbasaur:bronze",
      "001-bulbasaur:silver",
      "001-bulbasaur:gold",
      "001-bulbasaur:platinum",
    ]);
    const encoded = encodeOwnedLink(owned, resolver);
    expect(decodeOwnedLink(new URLSearchParams(encoded), resolver)).toEqual(owned);
  });

  it("ignores a dex above 1024 with no throw", () => {
    const owned = new Set(["001-bulbasaur:gold", "2000-too-high:gold"]);
    expect(() => encodeOwnedLink(owned, resolver)).not.toThrow();
    expect(
      decodeOwnedLink(new URLSearchParams(encodeOwnedLink(owned, resolver)), resolver),
    ).toEqual(new Set(["001-bulbasaur:gold"]));
  });

  it("keeps a full 258×4 payload under 800 characters", () => {
    const fullResolver: ShareResolver = {
      emblemIdForDex: (dex) => (dex >= 1 && dex <= 258 ? `${dex}-mon` : null),
      dexForEmblemId: (id) => Number(id.split("-")[0]),
    };
    const owned = new Set<string>();
    for (let dex = 1; dex <= 258; dex++) {
      for (const grade of ["bronze", "silver", "gold", "platinum"] as const) {
        owned.add(`${dex}-mon:${grade}`);
      }
    }
    const encoded = encodeOwnedLink(owned, fullResolver);
    const payload = encoded.slice(2);
    expect(payload.length).toBeLessThan(800);
    expect(decodeOwnedLink(new URLSearchParams(encoded), fullResolver)?.size).toBe(258 * 4);
  });
});

describe("readShareHash", () => {
  it("still yields a loadout from a legacy #b= hash", () => {
    const hash = `#b=${encodeURIComponent(encodeLoadout(fixture))}`;
    const parsed = readShareHash(hash, resolver);
    expect(parsed).toEqual({ kind: "loadout", loadout: fixture });
  });

  it("yields kind loadout for a readable #lv=15&p=lucario hash", () => {
    const parsed = readShareHash("#lv=15&p=lucario", resolver);
    expect(parsed?.kind).toBe("loadout");
    if (parsed?.kind === "loadout") {
      expect(parsed.loadout.pokemonId).toBe("lucario");
      expect(parsed.loadout.level).toBe(15);
    }
  });

  it("yields kind emblems for #e=", () => {
    expect(readShareHash("#e=", resolver)?.kind).toBe("emblems");
  });

  it("yields kind owned for #o=", () => {
    expect(readShareHash("#o=", resolver)?.kind).toBe("owned");
  });

  it("yields null for an empty hash", () => {
    expect(readShareHash("", resolver)).toBeNull();
    expect(readShareHash("#", resolver)).toBeNull();
  });
});
