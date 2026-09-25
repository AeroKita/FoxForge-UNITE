import { describe, expect, it } from "vitest";
import { ITEM_GRADE_MAX } from "../../data/gameData";
import type { HeldItem } from "../../types";
import {
  BULK_HELD_GRADE_PRESETS,
  BULK_SET_ALL_LABEL,
  bulkHeldGradeChipLabel,
  gradesAfterBulkSet,
} from "../HeldItemsInventory";

function item(id: string, graded: boolean): HeldItem {
  return {
    id,
    displayName: id,
    iconAsset: "",
    description: "",
    statsByGrade: graded ? { 40: { attack: 1 } } : {},
    conditionalEffects: [],
  };
}

describe("Items bulk grade chips", () => {
  it("labels the row Set all to", () => {
    expect(BULK_SET_ALL_LABEL).toBe("Set all to");
  });

  it("offers 1, 10, 20, and Max", () => {
    expect(BULK_HELD_GRADE_PRESETS).toEqual([1, 10, 20, ITEM_GRADE_MAX]);
    expect(BULK_HELD_GRADE_PRESETS.map(bulkHeldGradeChipLabel)).toEqual(["1", "10", "20", "Max"]);
  });
});

describe("gradesAfterBulkSet", () => {
  const muscle = item("muscle-band", true);
  const scope = item("scope-lens", true);
  const rusted = item("rusted-sword", false);

  it.each([1, 10, 20, 40])("writes grade %i onto graded items only", (grade) => {
    const next = gradesAfterBulkSet({}, [muscle, rusted, scope], grade);
    expect(next["muscle-band"]).toBe(grade);
    expect(next["scope-lens"]).toBe(grade);
    expect(next["rusted-sword"]).toBeUndefined();
  });

  it("leaves items outside the shown list at their previous grade", () => {
    const next = gradesAfterBulkSet({ "muscle-band": 30, "scope-lens": 20 }, [scope], 1);
    expect(next["scope-lens"]).toBe(1);
    expect(next["muscle-band"]).toBe(30);
  });
});
