import { describe, it, expect } from "vitest";
import { EQUIPPED_STATS_VIEW_KEY, readEquippedStatsView } from "../equippedStatsView";

describe("readEquippedStatsView", () => {
  it("defaults to flats when the v2 key is missing (new user or first load of this update)", () => {
    expect(readEquippedStatsView(() => null)).toBe("flats");
  });

  it("remembers the last saved tab for a returning visit", () => {
    expect(readEquippedStatsView((key) => (key === EQUIPPED_STATS_VIEW_KEY ? "sets" : null))).toBe(
      "sets",
    );
    expect(readEquippedStatsView((key) => (key === EQUIPPED_STATS_VIEW_KEY ? "flats" : null))).toBe(
      "flats",
    );
  });

  it("treats junk as flats and does not read the old v1 key", () => {
    expect(readEquippedStatsView(() => "with sets")).toBe("flats");
    expect(
      readEquippedStatsView((key) =>
        key === "unite-build-optimizer.equippedStats.v1" ? "sets" : null,
      ),
    ).toBe("flats");
  });
});
