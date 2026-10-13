import { describe, expect, it } from "vitest";
import { clampTooltipCenter, moveSpeedSofteningCopy, tooltipOpensAbove } from "../moveSpeedTip";

describe("moveSpeedSofteningCopy", () => {
  it("uses the short Basic note above 5,000", () => {
    expect(moveSpeedSofteningCopy(5576.8, false)).toBe(
      "Above 5,000, extra Speed has a reduced effect.",
    );
    expect(moveSpeedSofteningCopy(5800, false)).toBe(
      "Above 5,000, extra Speed has a reduced effect.",
    );
  });

  it("names both Advanced thresholds above 5,000", () => {
    expect(moveSpeedSofteningCopy(5576.8, true)).toBe(
      "Movement Speed gains are reduced above 5,000 (80%) and again above 5,700 (50%).",
    );
    expect(moveSpeedSofteningCopy(5800, true)).toBe(
      "Movement Speed gains are reduced above 5,000 (80%) and again above 5,700 (50%).",
    );
  });

  it("explains the floor below 2,500 without calling it diminishing returns", () => {
    const copy = moveSpeedSofteningCopy(1250, false);
    expect(copy).toMatch(/2,500/);
    expect(copy).toMatch(/higher than the raw total/i);
    expect(copy).not.toMatch(/diminishing/i);
    expect(moveSpeedSofteningCopy(1250, true)).toBe(copy);
  });

  it("is quiet inside the unchanged band", () => {
    expect(moveSpeedSofteningCopy(2500, false)).toBeNull();
    expect(moveSpeedSofteningCopy(3000, true)).toBeNull();
    expect(moveSpeedSofteningCopy(5000, true)).toBeNull();
  });
});

describe("clampTooltipCenter", () => {
  const width = 216;
  const margin = 12;
  const viewport = 390;

  it("shifts a right-edge trigger left so the tip stays on screen", () => {
    const center = clampTooltipCenter(370, viewport, width, margin);
    expect(center - width / 2).toBeGreaterThanOrEqual(margin);
    expect(center + width / 2).toBeLessThanOrEqual(viewport - margin);
    expect(center).toBeLessThan(370);
  });

  it("shifts a left-edge trigger right so the tip stays on screen", () => {
    const center = clampTooltipCenter(8, viewport, width, margin);
    expect(center - width / 2).toBeGreaterThanOrEqual(margin);
    expect(center + width / 2).toBeLessThanOrEqual(viewport - margin);
    expect(center).toBeGreaterThan(8);
  });

  it("leaves a trigger with room on both sides where it is", () => {
    expect(clampTooltipCenter(195, viewport, width, margin)).toBe(195);
  });

  it("centers the tip when the viewport is narrower than the tip plus margins", () => {
    expect(clampTooltipCenter(40, 100, width, margin)).toBe(50);
  });
});

describe("tooltipOpensAbove", () => {
  it("opens above when the trigger is far enough from the top", () => {
    expect(tooltipOpensAbove(200, 72, 12)).toBe(true);
  });

  it("opens below when the tip would leave the top of the screen", () => {
    expect(tooltipOpensAbove(40, 72, 12)).toBe(false);
  });
});
