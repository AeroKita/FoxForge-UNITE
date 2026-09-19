import { describe, it, expect } from "vitest";
import { setBonuses } from "../../data/gameData";
import { EMBLEM_SET_INFO } from "../emblemSets";
import { formatActiveSetBonuses, formatSetBonus, formatSetEffectShort } from "../setProgress";

describe("formatSetBonus", () => {
  it("stat colors use the short stat label and a positive percent", () => {
    expect(formatSetBonus("brown", 0.04)).toBe("+4% Atk");
    expect(formatSetBonus("black", 0.08)).toBe("+8% CDR");
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
    expect(formatSetEffectShort(yellow, { value: 12 })).toBe("+12% Move (OOC)");
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
