import { describe, expect, it } from "vitest";
import { deriveBuild } from "../../engine/derive";
import { emptyLoadout } from "../../state/loadout";
import { levelChartValue } from "../levelChart";

describe("levelChartValue", () => {
  it("plots Machamp crit as percentage points", () => {
    const d = deriveBuild(emptyLoadout("machamp"), true, [40, 40, 40]);
    expect(levelChartValue(d, "critRate")).toBe(20);
  });

  it("plots Submission+ as 10 more crit points", () => {
    const d = deriveBuild(
      { ...emptyLoadout("machamp"), activeBoostIds: ["move:Submission+"] },
      true,
      [40, 40, 40],
    );
    expect(levelChartValue(d, "critRate")).toBe(30);
  });

  it("plots attack speed from the boosted point total, not the raw fraction", () => {
    const d = deriveBuild(
      { ...emptyLoadout("machamp"), activeBoostIds: ["move:Submission+"] },
      true,
      [40, 40, 40],
    );
    expect(levelChartValue(d, "attackSpeed")).toBeCloseTo(d.attackSpeed!.asPoints, 6);
    expect(levelChartValue(d, "attackSpeed")).toBeGreaterThan(30);
  });
});
