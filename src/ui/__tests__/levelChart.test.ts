import { describe, expect, it } from "vitest";
import { deriveBuild } from "../../engine/derive";
import { emptyLoadout } from "../../state/loadout";
import { formatLevelChartValue, LEVEL_CHART_METRICS, levelChartValue } from "../levelChart";

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

  it("plots Accelgor as 10 more CDR points", () => {
    const off = deriveBuild(emptyLoadout("machamp"), true, [40, 40, 40]);
    const on = deriveBuild(
      { ...emptyLoadout("machamp"), activeBoostIds: ["accelgor"] },
      true,
      [40, 40, 40],
    );
    expect(levelChartValue(on, "cdr")! - levelChartValue(off, "cdr")!).toBeCloseTo(10, 6);
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

describe("level chart display", () => {
  it("places Atk Speed immediately before Attacks/sec", () => {
    const labels = LEVEL_CHART_METRICS.map((m) => m.label);
    expect(labels[labels.indexOf("Attacks/sec") - 1]).toBe("Atk Speed");
  });

  it("appends % only for percentage-point metrics", () => {
    expect(formatLevelChartValue(40, "attackSpeed")).toBe("40%");
    expect(formatLevelChartValue(40.0000002, "attackSpeed")).toBe("40%");
    expect(formatLevelChartValue(40.5, "attackSpeed")).toBe("40.5%");
    expect(formatLevelChartValue(20, "critRate")).toBe("20%");
    expect(formatLevelChartValue(10, "cdr")).toBe("10%");
    expect(formatLevelChartValue(5, "lifesteal")).toBe("5%");
    expect(formatLevelChartValue(1.25, "aps")).toBe("1.25");
    expect(formatLevelChartValue(4523, "hp")).toBe("4523");
  });
});
