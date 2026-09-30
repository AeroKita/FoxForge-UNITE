import { describe, expect, it } from "vitest";
import { emblems } from "../../data/gameData";
import { makeEmblem } from "../../engine/__tests__/fixtures";
import { STAT_ROWS } from "../format";
import {
  EMBLEM_STAT_FILTERS,
  emblemMatchesInventoryFilters,
  inventoryFilterCaption,
  inventoryFiltersActive,
  nextSignSelection,
  nextStatSelection,
  type EmblemInventoryFilters,
} from "../emblemInventoryFilter";

const open: EmblemInventoryFilters = { query: "", color: "all", stat: null, sign: null };

describe("EMBLEM_STAT_FILTERS", () => {
  it("lists every non-zero emblem stat in stat-panel order, and no others", () => {
    const present = new Set<string>();
    for (const emblem of emblems) {
      for (const grade of ["bronze", "silver", "gold"] as const) {
        for (const [key, value] of Object.entries(emblem.statsByGrade[grade])) {
          if (value != null && value !== 0) present.add(key);
        }
      }
    }
    expect(EMBLEM_STAT_FILTERS.map((row) => row.key)).toEqual(
      STAT_ROWS.map((row) => row.key).filter((key) => present.has(key)),
    );
    expect(EMBLEM_STAT_FILTERS.map((row) => row.label)).toContain("Defense");
  });
});

describe("nextStatSelection", () => {
  it("selects a stat, replaces it, and clears it when clicked again", () => {
    expect(nextStatSelection(null, "defense")).toBe("defense");
    expect(nextStatSelection("defense", "attack")).toBe("attack");
    expect(nextStatSelection("defense", "defense")).toBeNull();
  });
});

describe("nextSignSelection", () => {
  it("selects a sign, replaces it, and clears it when clicked again", () => {
    expect(nextSignSelection(null, "neg")).toBe("neg");
    expect(nextSignSelection("neg", "pos")).toBe("pos");
    expect(nextSignSelection("neg", "neg")).toBeNull();
  });
});

describe("emblemMatchesInventoryFilters", () => {
  const positiveDefense = makeEmblem("Plus", ["blue"], { defense: 8, hp: -10 });
  const negativeDefense = makeEmblem("Minus", ["white", "blue"], { defense: -5, attack: 2 });
  const noDefense = makeEmblem("None", ["green"], { spAttack: 3, hp: -20 });

  it("matches a name case-insensitively and ignores other emblems", () => {
    expect(emblemMatchesInventoryFilters(negativeDefense, "gold", { ...open, query: "min" })).toBe(
      true,
    );
    expect(emblemMatchesInventoryFilters(positiveDefense, "gold", { ...open, query: "min" })).toBe(
      false,
    );
  });

  it("matches either color on a dual-color emblem", () => {
    expect(
      emblemMatchesInventoryFilters(negativeDefense, "gold", { ...open, color: "white" }),
    ).toBe(true);
    expect(
      emblemMatchesInventoryFilters(negativeDefense, "gold", { ...open, color: "brown" }),
    ).toBe(false);
  });

  it("matches positive or negative defense, and either sign when the modifier is off", () => {
    expect(
      emblemMatchesInventoryFilters(positiveDefense, "gold", {
        ...open,
        stat: "defense",
        sign: "pos",
      }),
    ).toBe(true);
    expect(
      emblemMatchesInventoryFilters(negativeDefense, "gold", {
        ...open,
        stat: "defense",
        sign: "pos",
      }),
    ).toBe(false);
    expect(
      emblemMatchesInventoryFilters(negativeDefense, "gold", {
        ...open,
        stat: "defense",
        sign: "neg",
      }),
    ).toBe(true);
    expect(
      emblemMatchesInventoryFilters(noDefense, "gold", { ...open, stat: "defense", sign: "neg" }),
    ).toBe(false);
    expect(
      emblemMatchesInventoryFilters(positiveDefense, "gold", { ...open, stat: "defense" }),
    ).toBe(true);
    expect(
      emblemMatchesInventoryFilters(negativeDefense, "gold", { ...open, stat: "defense" }),
    ).toBe(true);
    expect(emblemMatchesInventoryFilters(noDefense, "gold", { ...open, stat: "defense" })).toBe(
      false,
    );
  });

  it("treats a zero stat as absent", () => {
    const zero = makeEmblem("Zero", ["blue"], { defense: 0, hp: 10 });
    expect(emblemMatchesInventoryFilters(zero, "gold", { ...open, stat: "defense" })).toBe(false);
  });

  it("uses the selected grade, and platinum reads gold", () => {
    const graded = makeEmblem("Graded", ["blue"], {});
    graded.statsByGrade = {
      bronze: { defense: 2 },
      silver: { defense: 0 },
      gold: { defense: -4 },
    };
    expect(
      emblemMatchesInventoryFilters(graded, "bronze", { ...open, stat: "defense", sign: "pos" }),
    ).toBe(true);
    expect(emblemMatchesInventoryFilters(graded, "silver", { ...open, stat: "defense" })).toBe(
      false,
    );
    expect(
      emblemMatchesInventoryFilters(graded, "gold", { ...open, stat: "defense", sign: "neg" }),
    ).toBe(true);
    expect(
      emblemMatchesInventoryFilters(graded, "platinum", { ...open, stat: "defense", sign: "neg" }),
    ).toBe(true);
  });

  it("requires the name, color, and stat modifier together", () => {
    expect(
      emblemMatchesInventoryFilters(negativeDefense, "gold", {
        query: "min",
        color: "blue",
        stat: "defense",
        sign: "neg",
      }),
    ).toBe(true);
    expect(
      emblemMatchesInventoryFilters(negativeDefense, "gold", {
        query: "plus",
        color: "blue",
        stat: "defense",
        sign: "neg",
      }),
    ).toBe(false);
    expect(
      emblemMatchesInventoryFilters(negativeDefense, "gold", {
        query: "min",
        color: "green",
        stat: "defense",
        sign: "neg",
      }),
    ).toBe(false);
  });

  it("with only a sign, keeps emblems that have any stat of that sign", () => {
    expect(emblemMatchesInventoryFilters(noDefense, "gold", { ...open, sign: "neg" })).toBe(true);
    expect(emblemMatchesInventoryFilters(noDefense, "gold", { ...open, sign: "pos" })).toBe(true);
    const onlyPositive = makeEmblem("Up", ["red"], { hp: 40, critRate: 0.01 });
    expect(emblemMatchesInventoryFilters(onlyPositive, "gold", { ...open, sign: "neg" })).toBe(
      false,
    );
  });

  it("finds real negative and positive defense emblems, including a blue subset", () => {
    const filters = { ...open, stat: "defense" as const, sign: "neg" as const };
    const negative = emblems.filter((emblem) =>
      emblemMatchesInventoryFilters(emblem, "gold", filters),
    );
    const positive = emblems.filter((emblem) =>
      emblemMatchesInventoryFilters(emblem, "gold", { ...open, stat: "defense", sign: "pos" }),
    );
    const blueNegative = emblems.filter((emblem) =>
      emblemMatchesInventoryFilters(emblem, "gold", { ...filters, color: "blue" }),
    );
    expect(negative.length).toBeGreaterThan(0);
    expect(positive.length).toBeGreaterThan(0);
    expect(negative.every((emblem) => (emblem.statsByGrade.gold.defense ?? 0) < 0)).toBe(true);
    expect(positive.every((emblem) => (emblem.statsByGrade.gold.defense ?? 0) > 0)).toBe(true);
    const negativeIds = new Set(negative.map((emblem) => emblem.id));
    expect(positive.some((emblem) => negativeIds.has(emblem.id))).toBe(false);
    expect(blueNegative.length).toBeGreaterThan(0);
    expect(blueNegative.length).toBeLessThan(negative.length);
    expect(blueNegative.every((emblem) => emblem.colors.includes("blue"))).toBe(true);
  });
});

describe("inventory filter caption", () => {
  it("is quiet until a color, stat, or sign is set", () => {
    expect(inventoryFiltersActive(open)).toBe(false);
    expect(inventoryFiltersActive({ ...open, query: "char" })).toBe(false);
    expect(inventoryFilterCaption(open)).toBeNull();
    expect(inventoryFilterCaption({ ...open, query: "char" })).toBeNull();
  });

  it("names the sign, the stat, and the color", () => {
    expect(inventoryFiltersActive({ ...open, stat: "defense", sign: "neg" })).toBe(true);
    expect(inventoryFilterCaption({ ...open, stat: "defense", sign: "neg" })).toBe("− Defense");
    expect(inventoryFilterCaption({ ...open, stat: "defense" })).toBe("Defense");
    expect(inventoryFilterCaption({ ...open, sign: "pos" })).toBe("positive stats");
    expect(inventoryFilterCaption({ ...open, sign: "neg" })).toBe("negative stats");
    expect(inventoryFilterCaption({ ...open, color: "blue", stat: "defense", sign: "neg" })).toBe(
      "− Defense · Blue",
    );
    expect(inventoryFilterCaption({ ...open, color: "blue" })).toBe("Blue");
  });
});
