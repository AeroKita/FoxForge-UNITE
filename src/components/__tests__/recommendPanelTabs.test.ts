import { describe, it, expect } from "vitest";
import { BUILD_TABS, buildsForTab } from "../RecommendPanel";

describe("Builds tabs", () => {
  const curated = [{ name: "curated" }];
  const creative = [{ name: "creative" }];

  it("exposes Recommended and Creative only", () => {
    expect(BUILD_TABS).toEqual(["recommended", "creative"]);
    expect(BUILD_TABS).not.toContain("yours");
  });

  it("returns curated builds for the Recommended tab", () => {
    expect(buildsForTab("recommended", curated, creative)).toBe(curated);
  });

  it("returns creative builds for the Creative tab", () => {
    expect(buildsForTab("creative", curated, creative)).toBe(creative);
  });
});
