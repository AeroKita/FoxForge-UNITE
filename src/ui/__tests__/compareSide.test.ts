import { describe, expect, it } from "vitest";
import {
  compareChartColor,
  compareColumnClass,
  compareIdentityClass,
  compareSwatchClass,
} from "../compareSide";

describe("compare side colors", () => {
  it("frames both lanes at the Pokémon icon height", () => {
    // h-8 icon (2rem) + py-2 (1rem) + border-2 (4px), so a text-only row matches the icon row.
    const iconRow = "min-h-[calc(2rem+1rem+4px)]";
    expect(compareIdentityClass("A")).toContain(iconRow);
    expect(compareIdentityClass("A")).toContain("border-2");
    expect(compareIdentityClass("A")).toContain("border-compare-a");
    expect(compareIdentityClass("A")).not.toContain("compare-b");
    expect(compareIdentityClass("B")).toContain(iconRow);
    expect(compareIdentityClass("B")).toContain("border-2");
    expect(compareIdentityClass("B")).toContain("border-compare-b");
    expect(compareIdentityClass("B")).not.toContain("compare-a");
  });

  it("washes the A and B stat columns and leaves the delta column alone", () => {
    expect(compareColumnClass("A")).toContain("bg-compare-a-wash");
    expect(compareColumnClass("A")).not.toContain("compare-b");
    expect(compareColumnClass("B")).toContain("bg-compare-b-wash");
    expect(compareColumnClass("B")).not.toContain("compare-a");
  });

  it("points the chart and the legend at the shared theme tokens", () => {
    expect(compareChartColor("A")).toBe("var(--color-compare-a)");
    expect(compareChartColor("B")).toBe("var(--color-compare-b)");
    expect(compareSwatchClass("A")).toBe("bg-compare-a");
    expect(compareSwatchClass("B")).toBe("bg-compare-b");
  });
});
