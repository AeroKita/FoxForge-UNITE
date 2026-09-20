import { describe, it, expect } from "vitest";
import { pokemonById } from "../../data/gameData";
import {
  presetBuilds,
  hasCreative,
  presetToLoadout,
  selectionToLoadout,
  type SideSelection,
} from "../compareBuilds";
import { emptyLoadout, type Loadout, type SavedLoadout } from "../loadout";

const withRecommended = [...pokemonById.values()].find((p) =>
  (p.builds ?? []).some((b) => b.emblems.length === 10),
)!;
const withCreative = [...pokemonById.values()].find((p) =>
  (p.creativeBuilds ?? []).some((b) => b.emblems.length === 10),
)!;
const withoutCreative = [...pokemonById.values()].find(
  (p) => !(p.creativeBuilds ?? []).some((b) => b.emblems.length === 10),
)!;

describe("presetBuilds", () => {
  it("returns only complete (10-emblem) builds", () => {
    const builds = presetBuilds(withRecommended, "recommended");
    expect(builds.length).toBeGreaterThan(0);
    for (const b of builds) {
      expect(b.emblems).toHaveLength(10);
    }
  });

  it("returns [] for null Pokémon", () => {
    expect(presetBuilds(null, "recommended")).toEqual([]);
    expect(presetBuilds(null, "creative")).toEqual([]);
  });

  it("returns [] for creative on a Pokémon without Creative builds", () => {
    expect(presetBuilds(withoutCreative, "creative")).toEqual([]);
  });
});

describe("hasCreative", () => {
  it("is true for a Pokémon with Creative builds", () => {
    expect(hasCreative(withCreative)).toBe(true);
    expect(presetBuilds(withCreative, "creative").length).toBeGreaterThan(0);
  });

  it("is false for a Pokémon without Creative builds", () => {
    expect(hasCreative(withoutCreative)).toBe(false);
  });
});

describe("presetToLoadout", () => {
  it("maps a curated build to a standalone level-15 loadout", () => {
    const build = presetBuilds(withRecommended, "recommended")[0];
    const loadout = presetToLoadout(withRecommended, build);

    expect(loadout.pokemonId).toBe(withRecommended.id);
    expect(loadout.level).toBe(15);
    expect(loadout.heldItemIds).toHaveLength(3);
    expect(loadout.emblems).toHaveLength(build.emblems.length);
    expect(loadout.battleItemId).toBe(build.battleItemId ?? null);
    expect(loadout.activeBoostIds).toEqual([]);

    if (build.moves?.length) {
      expect(loadout.move1Id).toBeTruthy();
      expect(loadout.move2Id).toBeTruthy();
    }
  });

  it("affixes Lucarionite on Mega Lucario presets", () => {
    const megaLucario = pokemonById.get("mega-lucario")!;
    const build = presetBuilds(megaLucario, "recommended")[0];
    const loadout = presetToLoadout(megaLucario, build);
    expect(loadout.heldItemIds).toContain("lucarionite");
  });
});

describe("selectionToLoadout", () => {
  const current: Loadout = {
    pokemonId: "lucario",
    level: 13,
    heldItemIds: ["muscle-band", "scope-lens", null],
    battleItemId: "x-attack",
    move1Id: "power-up-punch",
    move2Id: "bone-rush",
    emblems: [{ emblemId: "001-bulbasaur", grade: "gold" }],
    activeBoostIds: ["x-attack"],
  };

  const saved: SavedLoadout[] = [
    {
      ...emptyLoadout("pikachu"),
      id: "save-1",
      name: "Test",
      savedAt: 1,
      level: 14,
    },
  ];

  it("returns current loadout for source current", () => {
    const sel: SideSelection = {
      source: "current",
      pokemonId: null,
      variant: 0,
      savedId: null,
    };
    expect(selectionToLoadout(sel, current, saved)).toBe(current);
  });

  it("returns saved loadout when id matches", () => {
    const sel: SideSelection = {
      source: "saved",
      pokemonId: null,
      variant: 0,
      savedId: "save-1",
    };
    const out = selectionToLoadout(sel, current, saved);
    expect(out.pokemonId).toBe("pikachu");
    expect(out.level).toBe(14);
  });

  it("falls back to current when saved id is missing", () => {
    const sel: SideSelection = {
      source: "saved",
      pokemonId: null,
      variant: 0,
      savedId: "gone",
    };
    expect(selectionToLoadout(sel, current, saved)).toBe(current);
  });

  it("resolves recommended preset for valid Pokémon + variant", () => {
    const sel: SideSelection = {
      source: "recommended",
      pokemonId: withRecommended.id,
      variant: 0,
      savedId: null,
    };
    const out = selectionToLoadout(sel, current, saved);
    expect(out.pokemonId).toBe(withRecommended.id);
    expect(out.emblems.length).toBeGreaterThan(0);
  });

  it("clamps out-of-range variant", () => {
    const builds = presetBuilds(withRecommended, "recommended");
    const sel: SideSelection = {
      source: "recommended",
      pokemonId: withRecommended.id,
      variant: 999,
      savedId: null,
    };
    const out = selectionToLoadout(sel, current, saved);
    const expected = presetToLoadout(withRecommended, builds[builds.length - 1]);
    expect(out.emblems).toEqual(expected.emblems);
  });

  it("returns empty loadout for unknown pokemonId on preset source", () => {
    const sel: SideSelection = {
      source: "recommended",
      pokemonId: "not-a-real-pokemon",
      variant: 0,
      savedId: null,
    };
    const out = selectionToLoadout(sel, current, saved);
    expect(out).toEqual(emptyLoadout("not-a-real-pokemon"));
  });

  it("strips unique items from a saved loadout on the wrong Pokémon", () => {
    const mismatched: SavedLoadout[] = [
      {
        ...emptyLoadout("pikachu"),
        id: "save-unique",
        name: "Wrong unique",
        savedAt: 1,
        heldItemIds: ["rusted-sword", "muscle-band", null],
      },
    ];
    const sel: SideSelection = {
      source: "saved",
      pokemonId: null,
      variant: 0,
      savedId: "save-unique",
    };
    expect(selectionToLoadout(sel, current, mismatched).heldItemIds).toEqual([
      null,
      "muscle-band",
      null,
    ]);
  });
});
