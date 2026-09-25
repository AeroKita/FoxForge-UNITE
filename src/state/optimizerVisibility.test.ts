import { describe, expect, it } from "vitest";
import { ownedForOptimizer } from "./optimizerVisibility";

describe("ownedForOptimizer", () => {
  it("uses the live inventory while Optimize is visible", () => {
    const live = new Set(["a:gold"]);
    const shown = new Set<string>();
    expect(ownedForOptimizer(true, live, shown)).toBe(live);
  });

  it("keeps the last visible inventory while Optimize is hidden", () => {
    const live = new Set(["a:gold", "b:silver"]);
    const shown = new Set(["a:gold"]);
    expect(ownedForOptimizer(false, live, shown)).toBe(shown);
  });
});
