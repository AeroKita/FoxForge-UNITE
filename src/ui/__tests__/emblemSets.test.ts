import { describe, expect, it } from "vitest";
import { EMBLEM_SET_INFO, formatSetMagnitude, formatSetTier } from "../emblemSets";

describe("emblem color-set infographic data", () => {
  const byColor = new Map(EMBLEM_SET_INFO.map((r) => [r.color, r]));

  it("covers all 11 colors", () => {
    expect(EMBLEM_SET_INFO).toHaveLength(11);
  });

  it("brown is an Attack stat set: 2/4/6 → +1/2/4%", () => {
    const brown = byColor.get("brown")!;
    expect(brown.kind).toBe("stat");
    expect(brown.label).toBe("Attack");
    expect(brown.unit).toBe("percent");
    expect(brown.sign).toBe("+");
    expect(brown.tiers).toEqual([
      { count: 2, value: 1 },
      { count: 4, value: 2 },
      { count: 6, value: 4 },
    ]);
  });

  it("red label is basic attack speed and peaks at +8% with 7", () => {
    const red = byColor.get("red")!;
    expect(red.label).toBe("basic attack speed");
    expect(red.unit).toBe("percent");
    expect(red.tiers.at(-1)).toEqual({ count: 7, value: 8 });
  });

  it("black is move cooldown reduction", () => {
    expect(byColor.get("black")!.label).toBe("move cooldown reduction");
  });

  it("yellow is movement speed when out of combat with no note", () => {
    const yellow = byColor.get("yellow")!;
    expect(yellow.label).toBe("movement speed when out of combat");
    expect(yellow.note).toBeUndefined();
  });

  it("pink, navy, and gray are utility rows with a minus sign", () => {
    for (const c of ["pink", "navy", "gray"] as const) {
      const r = byColor.get(c)!;
      expect(r.kind).toBe("utility");
      expect(r.sign).toBe("−");
      expect(r.tiers.length).toBeGreaterThan(0);
    }
    expect(byColor.get("pink")!.label).toBe("hindrance effect duration");
    expect(byColor.get("navy")!.label).toBe("Unite Move gauge time to full charge");
    expect(byColor.get("gray")!.label).toBe("received damage");
  });

  it("gray is a flat unit; every other color is percent", () => {
    const gray = byColor.get("gray")!;
    expect(gray.unit).toBe("flat");
    expect(gray.tiers).toEqual([
      { count: 3, value: 3 },
      { count: 5, value: 6 },
      { count: 7, value: 12 },
    ]);
    for (const r of EMBLEM_SET_INFO) {
      if (r.color === "gray") continue;
      expect(r.unit, r.color).toBe("percent");
    }
  });

  it("utility rows are pink, navy, gray so the optimizer Color card can list them", () => {
    expect(EMBLEM_SET_INFO.filter((r) => r.kind === "utility").map((r) => r.color)).toEqual([
      "pink",
      "navy",
      "gray",
    ]);
  });
});

describe("formatSetTier", () => {
  const byColor = new Map(EMBLEM_SET_INFO.map((r) => [r.color, r]));

  it("prints in-game wording for brown, gray, pink, and navy", () => {
    const brown = byColor.get("brown")!;
    const gray = byColor.get("gray")!;
    const pink = byColor.get("pink")!;
    const navy = byColor.get("navy")!;
    expect(formatSetTier(brown, brown.tiers[0])).toBe("+1% Attack");
    expect(formatSetTier(gray, gray.tiers[0])).toBe("−3 received damage");
    expect(formatSetTier(pink, pink.tiers[0])).toBe("−4% hindrance effect duration");
    expect(formatSetTier(navy, navy.tiers[0])).toBe("−1% Unite Move gauge time to full charge");
  });

  it("never prints % on gray and always prints % on every other color", () => {
    for (const row of EMBLEM_SET_INFO) {
      for (const t of row.tiers) {
        const mag = formatSetMagnitude(row, t.value);
        const tier = formatSetTier(row, t);
        if (row.color === "gray") {
          expect(mag).not.toContain("%");
          expect(tier).not.toContain("%");
        } else {
          expect(mag).toContain("%");
          expect(tier).toContain("%");
        }
      }
    }
  });
});
