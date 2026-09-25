import { describe, expect, it } from "vitest";
import { makeEmblem } from "../engine/__tests__/fixtures";
import { statLines } from "./format";
import { emblemGradeStatLines, emblemGradeSubtitle } from "./emblemStatText";

describe("emblem grade stat text", () => {
  const emblem = makeEmblem("Pikachu", ["yellow"], {});
  emblem.statsByGrade = {
    bronze: { hp: 6 },
    silver: { hp: 12 },
    gold: { hp: 24, attack: 1.2 },
  };

  it("formats each emblem and grade once", () => {
    const first = emblemGradeStatLines(emblem, "gold", true);
    const second = emblemGradeStatLines(emblem, "gold", true);
    expect(second).toBe(first);
    expect(first).toEqual(statLines(emblem.statsByGrade.gold, true));
  });

  it("formats a new grade instead of reusing another grade's text", () => {
    const gold = emblemGradeSubtitle(emblem, "gold", true);
    const bronze = emblemGradeSubtitle(emblem, "bronze", true);
    expect(gold).toContain("24");
    expect(bronze).toContain("6");
    expect(bronze).not.toContain("24");
  });

  it("returns the same subtitle for an unchanged tile", () => {
    expect(emblemGradeSubtitle(emblem, "silver", true)).toBe(
      emblemGradeSubtitle(emblem, "silver", true),
    );
    expect(emblemGradeSubtitle(emblem, "silver", true)).toContain("12");
  });
});
