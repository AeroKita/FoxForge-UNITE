import { describe, it, expect } from "vitest";
import { EMBLEM_SET_INFO } from "../emblemSets";

describe("emblem color-set infographic data", () => {
  const byColor = new Map(EMBLEM_SET_INFO.map((r) => [r.color, r]));

  it("covers all 11 colors", () => {
    expect(EMBLEM_SET_INFO).toHaveLength(11);
  });

  it("brown is an Attack stat set: 2/4/6 → +1/2/4%", () => {
    const brown = byColor.get("brown")!;
    expect(brown.kind).toBe("stat");
    expect(brown.label).toBe("Attack");
    expect(brown.tiers).toEqual([
      { count: 2, percent: 1 },
      { count: 4, percent: 2 },
      { count: 6, percent: 4 },
    ]);
  });

  it("red Attack Speed peaks at +8% with 7", () => {
    expect(byColor.get("red")!.tiers.at(-1)).toEqual({ count: 7, percent: 8 });
  });

  it("pink/navy/gray are utility sets with positive magnitudes", () => {
    for (const c of ["pink", "navy", "gray"] as const) {
      const r = byColor.get(c)!;
      expect(r.kind).toBe("utility");
      expect(r.tiers.length).toBeGreaterThan(0);
      expect(r.tiers.every((t) => t.percent > 0)).toBe(true);
    }
    expect(byColor.get("pink")!.tiers).toEqual([
      { count: 3, percent: 4 },
      { count: 5, percent: 8 },
      { count: 7, percent: 16 },
    ]);
  });

  it("utility rows are pink, navy, gray so the optimizer Color card can list them", () => {
    expect(EMBLEM_SET_INFO.filter((r) => r.kind === "utility").map((r) => r.color)).toEqual([
      "pink",
      "navy",
      "gray",
    ]);
  });
});
