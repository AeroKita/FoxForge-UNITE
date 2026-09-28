import { describe, expect, it } from "vitest";
import {
  BUILD_VARIANT_PAGER_CLASS,
  buildVariantPagerLabel,
  buildVariantPositionLabel,
  canCycleBuilds,
} from "../BuildVariantPager";

describe("build variant pager", () => {
  it("treats a single build as nothing to cycle", () => {
    expect(canCycleBuilds(0)).toBe(false);
    expect(canCycleBuilds(1)).toBe(false);
    expect(canCycleBuilds(2)).toBe(true);
  });

  it("keeps the position out of the title and only shows it when another build exists", () => {
    expect(buildVariantPositionLabel(0, 1)).toBeNull();
    expect(buildVariantPositionLabel(0, 2)).toBe("1/2");
    expect(buildVariantPositionLabel(1, 2)).toBe("2/2");
    expect(buildVariantPositionLabel(5, 2)).toBe("2/2");
  });

  it("names the control as a list when paging and as the only build otherwise", () => {
    expect(buildVariantPagerLabel(0, 1)).toBe("Only build");
    expect(buildVariantPagerLabel(0, 2)).toBe("Build 1 of 2");
    expect(buildVariantPagerLabel(1, 3)).toBe("Build 2 of 3");
  });

  it("lifts the tray and uses the outline arrows only when another build exists", () => {
    expect(BUILD_VARIANT_PAGER_CLASS.trayCycling).toMatch(/bg-surface/);
    expect(BUILD_VARIANT_PAGER_CLASS.trayCycling).toMatch(/ring-accent/);
    expect(BUILD_VARIANT_PAGER_CLASS.arrowCycling).toMatch(/border-line/);
    expect(BUILD_VARIANT_PAGER_CLASS.arrowCycling).toMatch(/text-ink/);
    expect(BUILD_VARIANT_PAGER_CLASS.arrowCycling).not.toMatch(/\bbg-accent\b/);
    expect(BUILD_VARIANT_PAGER_CLASS.position).toMatch(/tabular-nums/);

    expect(BUILD_VARIANT_PAGER_CLASS.traySolo).not.toMatch(/bg-surface/);
    expect(BUILD_VARIANT_PAGER_CLASS.traySolo).not.toMatch(/bg-raise/);
    expect(BUILD_VARIANT_PAGER_CLASS.traySolo).not.toMatch(/ring-/);
    expect(BUILD_VARIANT_PAGER_CLASS).not.toHaveProperty("arrowSolo");
  });
});
