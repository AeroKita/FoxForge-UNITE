import { describe, it, expect } from "vitest";
import { setBonuses } from "../../data/gameData";
import { EMBLEM_SET_INFO } from "../emblemSets";
import {
  COLOR_SET_GUIDE_TITLE,
  emblemSetGuideRows,
  formatActiveSetBonuses,
  formatSetBonus,
  formatSetEffectEquipped,
  formatSetEffectShort,
  guideSetNoun,
  setEffectNoun,
} from "../setProgress";

describe("formatSetBonus", () => {
  it("stat colors use the short stat label and a positive percent", () => {
    expect(formatSetBonus("brown", 0.04)).toBe("+4% Atk");
    expect(formatSetBonus("black", 0.08)).toBe("+8% CDR");
    expect(formatSetBonus("yellow", 0.12)).toBe("+12% Speed");
  });

  it("utility colors show the in-game effect, not the HP placeholder", () => {
    expect(formatSetBonus("pink", -0.16)).toBe("−16% hindrance effect duration");
    expect(formatSetBonus("navy", -0.02)).toBe("−2% Unite Move gauge time to full charge");
    expect(formatSetBonus("gray", -0.12)).toBe("−12 received damage");
  });

  it("formatActiveSetBonuses lists color plus effect", () => {
    expect(
      formatActiveSetBonuses([
        { color: "brown", bonusPercent: 0.04 },
        { color: "pink", bonusPercent: -0.16 },
      ]),
    ).toBe("brown +4% Atk, pink −16% hindrance effect duration");
  });

  it("utility strings never contain HP or +-", () => {
    for (const color of ["pink", "navy", "gray"] as const) {
      const def = setBonuses.find((s) => s.color === color);
      expect(def).toBeDefined();
      for (const value of Object.values(def!.thresholds)) {
        const text = formatSetBonus(color, value);
        expect(text).not.toContain("HP");
        expect(text).not.toContain("+-");
      }
    }
  });
});

describe("formatSetEffectShort", () => {
  const byColor = new Map(EMBLEM_SET_INFO.map((r) => [r.color, r]));

  it("uses compact stat labels so Equipped Sets rows do not wrap", () => {
    const brown = byColor.get("brown")!;
    const red = byColor.get("red")!;
    const yellow = byColor.get("yellow")!;
    expect(formatSetEffectShort(brown, { value: 4 })).toBe("+4% Atk");
    expect(formatSetEffectShort(red, { value: 8 })).toBe("+8% Atk Spd");
    expect(formatSetEffectShort(yellow, { value: 12 })).toBe("+12% Speed (OOC)");
  });

  it("shortens utility phrases without using the HP placeholder", () => {
    const pink = byColor.get("pink")!;
    const navy = byColor.get("navy")!;
    const gray = byColor.get("gray")!;
    expect(formatSetEffectShort(pink, { value: 16 })).toBe("−16% hindrance");
    expect(formatSetEffectShort(navy, { value: 2 })).toBe("−2% Unite charge");
    expect(formatSetEffectShort(gray, { value: 3 })).toBe("−3 dmg");
  });
});

describe("formatSetEffectEquipped", () => {
  const byColor = new Map(EMBLEM_SET_INFO.map((r) => [r.color, r]));

  it("spells out yellow Speed (Out of Combat) on Equipped Sets expand", () => {
    const yellow = byColor.get("yellow")!;
    const brown = byColor.get("brown")!;
    expect(formatSetEffectEquipped(yellow, { value: 12 })).toBe("+12% Speed (Out of Combat)");
    expect(formatSetEffectEquipped(brown, { value: 4 })).toBe("+4% Atk");
  });
});

describe("setEffectNoun", () => {
  const byColor = new Map(EMBLEM_SET_INFO.map((r) => [r.color, r]));

  it("keeps compact nouns on Equipped Sets rows", () => {
    expect(setEffectNoun(byColor.get("brown")!)).toBe("Atk");
    expect(setEffectNoun(byColor.get("yellow")!)).toBe("Speed (OOC)");
    expect(setEffectNoun(byColor.get("pink")!)).toBe("hindrance");
  });
});

describe("guideSetNoun", () => {
  const byColor = new Map(EMBLEM_SET_INFO.map((r) => [r.color, r]));

  it("spells stats out for beginners and keeps HP short", () => {
    expect(guideSetNoun(byColor.get("brown")!)).toBe("Attack");
    expect(guideSetNoun(byColor.get("green")!)).toBe("Special Attack");
    expect(guideSetNoun(byColor.get("blue")!)).toBe("Defense");
    expect(guideSetNoun(byColor.get("purple")!)).toBe("Special Defense");
    expect(guideSetNoun(byColor.get("white")!)).toBe("HP");
    expect(guideSetNoun(byColor.get("red")!)).toBe("Basic Attack Speed");
    expect(guideSetNoun(byColor.get("yellow")!)).toBe("Movement Speed (Out of Combat)");
    expect(guideSetNoun(byColor.get("black")!)).toBe("Cooldown Reduction");
  });

  it("uses full utility names", () => {
    expect(guideSetNoun(byColor.get("pink")!)).toBe("Hindrance Effect Duration");
    expect(guideSetNoun(byColor.get("navy")!)).toBe("Unite Charge Rate");
    expect(guideSetNoun(byColor.get("gray")!)).toBe("Damage Received");
  });
});

describe("emblemSetGuideRows", () => {
  it("lists every color with guide nouns and per-tier magnitudes", () => {
    expect(COLOR_SET_GUIDE_TITLE).toBe("Color-Set Guide");
    const rows = emblemSetGuideRows();
    expect(rows).toHaveLength(EMBLEM_SET_INFO.length);
    const brown = rows.find((r) => r.color === "brown")!;
    expect(brown.kind).toBe("stat");
    expect(brown.noun).toBe("Attack");
    expect(brown.tiers).toEqual([
      { count: 2, magnitude: "+1%" },
      { count: 4, magnitude: "+2%" },
      { count: 6, magnitude: "+4%" },
    ]);
    const yellow = rows.find((r) => r.color === "yellow")!;
    expect(yellow.noun).toBe("Movement Speed (Out of Combat)");
    expect(yellow.tiers.map((t) => t.magnitude)).toEqual(["+4%", "+6%", "+12%"]);
    const gray = rows.find((r) => r.color === "gray")!;
    expect(gray.kind).toBe("utility");
    expect(gray.noun).toBe("Damage Received");
    expect(gray.tiers.map((t) => t.magnitude)).toEqual(["−3", "−6", "−12"]);
  });
});
