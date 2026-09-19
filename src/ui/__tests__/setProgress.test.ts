import { describe, it, expect } from "vitest";
import { setBonuses } from "../../data/gameData";
import { formatActiveSetBonuses, formatSetBonus } from "../setProgress";

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
