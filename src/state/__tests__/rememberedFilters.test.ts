import { describe, expect, it } from "vitest";
import {
  EMBLEM_PAGE_FILTERS_KEY,
  POKEMON_PICKER_ROLE_KEY,
  commitEmblemPageFilters,
  commitPokemonPickerRole,
  defaultEmblemPageFilters,
  loadEmblemPageFilters,
  loadPokemonPickerRole,
  parseEmblemPageFilters,
  parsePokemonPickerRole,
  type EmblemPageFilters,
} from "../rememberedFilters";

const greenDefense: EmblemPageFilters = {
  grade: "silver",
  color: "green",
  stat: "defense",
  sign: "neg",
};

function memoryStorage() {
  const memory = new Map<string, string>();
  return {
    memory,
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
  };
}

describe("pokémon picker role memory", () => {
  it("defaults to All when nothing is stored", () => {
    expect(loadPokemonPickerRole(() => null)).toBe("All");
  });

  it("defaults to All when storage throws", () => {
    expect(
      loadPokemonPickerRole(() => {
        throw new Error("private mode");
      }),
    ).toBe("All");
  });

  it("round-trips the last role pill", () => {
    const storage = memoryStorage();
    expect(commitPokemonPickerRole("Speedster", storage.setItem)).toBe("Speedster");
    expect(storage.memory.get(POKEMON_PICKER_ROLE_KEY)).toBe("Speedster");
    expect(loadPokemonPickerRole(storage.getItem)).toBe("Speedster");
  });

  it("rejects a role that is not a picker pill", () => {
    expect(parsePokemonPickerRole("Speedster")).toBe("Speedster");
    expect(parsePokemonPickerRole("AllRounder")).toBe("AllRounder");
    expect(parsePokemonPickerRole("all")).toBeNull();
    expect(parsePokemonPickerRole("Assassin")).toBeNull();
    expect(parsePokemonPickerRole(null)).toBeNull();
    expect(parsePokemonPickerRole(12)).toBeNull();
    expect(loadPokemonPickerRole(() => "nope")).toBe("All");
    expect(loadPokemonPickerRole(() => "")).toBe("All");
  });

  it("swallows a throwing setter", () => {
    expect(() =>
      commitPokemonPickerRole("Defender", () => {
        throw new Error("quota");
      }),
    ).not.toThrow();
  });
});

describe("emblems page filter memory", () => {
  it("defaults to gold and no filters when nothing is stored", () => {
    expect(defaultEmblemPageFilters()).toEqual({
      grade: "gold",
      color: "all",
      stat: null,
      sign: null,
    });
    expect(loadEmblemPageFilters(() => null)).toEqual(defaultEmblemPageFilters());
  });

  it("defaults when storage throws or the payload is not an object", () => {
    expect(
      loadEmblemPageFilters(() => {
        throw new Error("private mode");
      }),
    ).toEqual(defaultEmblemPageFilters());
    expect(parseEmblemPageFilters(null)).toBeNull();
    expect(parseEmblemPageFilters("green")).toBeNull();
    expect(parseEmblemPageFilters([])).toBeNull();
    expect(loadEmblemPageFilters(() => "{")).toEqual(defaultEmblemPageFilters());
    expect(loadEmblemPageFilters(() => "null")).toEqual(defaultEmblemPageFilters());
  });

  it("round-trips grade, color, stat, and sign", () => {
    const storage = memoryStorage();
    expect(commitEmblemPageFilters(greenDefense, storage.setItem)).toEqual(greenDefense);
    expect(storage.memory.has(EMBLEM_PAGE_FILTERS_KEY)).toBe(true);
    expect(loadEmblemPageFilters(storage.getItem)).toEqual(greenDefense);
  });

  it("keeps valid fields and repairs the rest", () => {
    expect(
      parseEmblemPageFilters({
        grade: "platinum",
        color: "green",
        stat: "not-a-stat",
        sign: "both",
        query: "pika",
      }),
    ).toEqual({
      grade: "gold",
      color: "green",
      stat: null,
      sign: null,
    });
    expect(
      parseEmblemPageFilters({
        grade: "bronze",
        color: "Green",
        stat: "spAttack",
        sign: "pos",
      }),
    ).toEqual({
      grade: "bronze",
      color: "all",
      stat: "spAttack",
      sign: "pos",
    });
  });

  it("stores a cleared filter set without a name query", () => {
    const storage = memoryStorage();
    commitEmblemPageFilters(
      { grade: "bronze", color: "all", stat: null, sign: null },
      storage.setItem,
    );
    const raw = storage.memory.get(EMBLEM_PAGE_FILTERS_KEY);
    expect(raw).toBeTypeOf("string");
    expect(raw).not.toContain("query");
    expect(loadEmblemPageFilters(storage.getItem)).toEqual({
      grade: "bronze",
      color: "all",
      stat: null,
      sign: null,
    });
  });

  it("swallows a throwing setter", () => {
    expect(() =>
      commitEmblemPageFilters(greenDefense, () => {
        throw new Error("quota");
      }),
    ).not.toThrow();
  });
});
