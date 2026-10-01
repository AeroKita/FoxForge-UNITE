import { describe, expect, it } from "vitest";
import {
  EMBLEM_PAGE_FILTERS_KEY,
  EMBLEM_PICKER_FILTERS_KEY,
  POKEMON_PICKER_ROLE_KEY,
  commitEmblemPageFilters,
  commitEmblemPickerFilters,
  commitPokemonPickerRole,
  defaultEmblemPageFilters,
  defaultEmblemPickerFilters,
  loadEmblemPageFilters,
  loadEmblemPickerFilters,
  loadPokemonPickerRole,
  parseEmblemPageFilters,
  parseEmblemPickerFilters,
  parsePokemonPickerRole,
  type EmblemPageFilters,
  type EmblemPickerFilters,
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

const attackOwned: EmblemPickerFilters = {
  color: "white",
  ownedOnly: true,
  stat: "attack",
  sign: "pos",
};

describe("emblem picker filter memory", () => {
  it("defaults to every color and no stat filter when nothing is stored", () => {
    expect(defaultEmblemPickerFilters()).toEqual({
      color: null,
      ownedOnly: false,
      stat: null,
      sign: null,
    });
    expect(loadEmblemPickerFilters(() => null)).toEqual(defaultEmblemPickerFilters());
  });

  it("defaults when storage throws or the payload is not an object", () => {
    expect(
      loadEmblemPickerFilters(() => {
        throw new Error("private mode");
      }),
    ).toEqual(defaultEmblemPickerFilters());
    expect(parseEmblemPickerFilters(null)).toBeNull();
    expect(parseEmblemPickerFilters("white")).toBeNull();
    expect(parseEmblemPickerFilters([])).toBeNull();
    expect(loadEmblemPickerFilters(() => "{")).toEqual(defaultEmblemPickerFilters());
    expect(loadEmblemPickerFilters(() => "null")).toEqual(defaultEmblemPickerFilters());
  });

  it("round-trips color, owned-only, stat, and sign", () => {
    const storage = memoryStorage();
    expect(commitEmblemPickerFilters(attackOwned, storage.setItem)).toEqual(attackOwned);
    expect(storage.memory.has(EMBLEM_PICKER_FILTERS_KEY)).toBe(true);
    expect(storage.memory.has(EMBLEM_PAGE_FILTERS_KEY)).toBe(false);
    expect(loadEmblemPickerFilters(storage.getItem)).toEqual(attackOwned);
  });

  it("keeps valid fields and repairs the rest", () => {
    expect(
      parseEmblemPickerFilters({
        color: "white",
        ownedOnly: "yes",
        stat: "nope",
        sign: "both",
        query: "absol",
        grade: "bronze",
      }),
    ).toEqual({
      color: "white",
      ownedOnly: false,
      stat: null,
      sign: null,
    });
    expect(
      parseEmblemPickerFilters({
        color: "White",
        ownedOnly: true,
        stat: "spAttack",
        sign: "neg",
      }),
    ).toEqual({
      color: null,
      ownedOnly: true,
      stat: "spAttack",
      sign: "neg",
    });
  });

  it("stores a cleared filter set without a name query or grade", () => {
    const storage = memoryStorage();
    commitEmblemPickerFilters(defaultEmblemPickerFilters(), storage.setItem);
    const raw = storage.memory.get(EMBLEM_PICKER_FILTERS_KEY);
    expect(raw).toBeTypeOf("string");
    expect(raw).not.toContain("query");
    expect(raw).not.toContain("grade");
    expect(loadEmblemPickerFilters(storage.getItem)).toEqual(defaultEmblemPickerFilters());
  });

  it("swallows a throwing setter", () => {
    expect(() =>
      commitEmblemPickerFilters(attackOwned, () => {
        throw new Error("quota");
      }),
    ).not.toThrow();
  });
});
