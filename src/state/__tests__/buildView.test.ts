import { describe, expect, it } from "vitest";
import {
  BUILD_VIEW_KEY,
  buildViewForPokemon,
  clampedBuildIndex,
  defaultBuildView,
  loadBuildView,
  parseBuildView,
  saveBuildView,
  type BuildView,
} from "../buildView";

const machampCreative: BuildView = {
  pokemonId: "machamp",
  tab: "creative",
  idxByTab: { recommended: 1, creative: 3 },
};

describe("build view persistence", () => {
  it("defaults to Recommended build 1 when nothing is stored", () => {
    expect(defaultBuildView("machamp")).toEqual({
      pokemonId: "machamp",
      tab: "recommended",
      idxByTab: { recommended: 0, creative: 0 },
    });
    expect(loadBuildView("machamp", () => null)).toEqual(defaultBuildView("machamp"));
  });

  it("defaults when storage throws", () => {
    expect(
      loadBuildView("machamp", () => {
        throw new Error("private mode");
      }),
    ).toEqual(defaultBuildView("machamp"));
  });

  it("round-trips the same Pokémon's tab and both indexes", () => {
    const memory = new Map<string, string>();
    saveBuildView(machampCreative, (key, value) => {
      memory.set(key, value);
    });
    expect(memory.has(BUILD_VIEW_KEY)).toBe(true);
    expect(loadBuildView("machamp", (key) => memory.get(key) ?? null)).toEqual(machampCreative);
  });

  it("ignores a stored view for a different Pokémon", () => {
    expect(buildViewForPokemon(machampCreative, "pikachu")).toEqual(defaultBuildView("pikachu"));
    const raw = JSON.stringify(machampCreative);
    expect(loadBuildView("pikachu", (key) => (key === BUILD_VIEW_KEY ? raw : null))).toEqual(
      defaultBuildView("pikachu"),
    );
  });

  it("ignores junk, a bad tab, and a non-integer or negative index", () => {
    expect(parseBuildView("nope")).toBeNull();
    expect(parseBuildView(null)).toBeNull();
    expect(parseBuildView({ pokemonId: "machamp" })).toBeNull();
    expect(
      parseBuildView({
        pokemonId: "machamp",
        tab: "yours",
        idxByTab: { recommended: 0, creative: 0 },
      }),
    ).toBeNull();
    expect(
      parseBuildView({
        pokemonId: "machamp",
        tab: "recommended",
        idxByTab: { recommended: -1, creative: 0 },
      }),
    ).toBeNull();
    expect(
      parseBuildView({
        pokemonId: "machamp",
        tab: "recommended",
        idxByTab: { recommended: 1.5, creative: 0 },
      }),
    ).toBeNull();
    expect(loadBuildView("machamp", () => "{")).toEqual(defaultBuildView("machamp"));
    expect(loadBuildView("machamp", () => JSON.stringify({ tab: "creative" }))).toEqual(
      defaultBuildView("machamp"),
    );
  });

  it("clamps the visible index into the current list", () => {
    expect(clampedBuildIndex(5, 2)).toBe(1);
    expect(clampedBuildIndex(-3, 4)).toBe(0);
    expect(clampedBuildIndex(0, 0)).toBe(0);
    expect(clampedBuildIndex(3, 0)).toBe(0);
  });

  it("swallows a throwing setter", () => {
    expect(() =>
      saveBuildView(machampCreative, () => {
        throw new Error("quota");
      }),
    ).not.toThrow();
  });
});
