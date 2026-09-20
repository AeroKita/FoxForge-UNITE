import { describe, it, expect } from "vitest";
import {
  BUILD_TABS,
  BUILD_KIT_SECTION_CLASS,
  BUILD_KIT_TOOLTIP_TRIGGER,
  buildsForTab,
} from "../RecommendPanel";

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

describe("Builds kit section layout", () => {
  function baseOrder(cls: string): number {
    const m = cls.match(/(?:^|\s)order-(\d+)/);
    return m ? Number(m[1]) : 0;
  }

  function smOrder(cls: string): number {
    const m = cls.match(/sm:order-(\d+)/);
    return m ? Number(m[1]) : baseOrder(cls);
  }

  it("puts Final Moves first and full-width on mobile, then Held + Battle, then Emblems", () => {
    const { held, moves, battle, emblems } = BUILD_KIT_SECTION_CLASS;
    expect(baseOrder(moves)).toBe(1);
    expect(baseOrder(held)).toBe(2);
    expect(baseOrder(battle)).toBe(3);
    expect(baseOrder(emblems)).toBe(4);
    expect(moves).toMatch(/(?:^|\s)w-full(?:\s|$)/);
    expect(emblems).toMatch(/(?:^|\s)w-full(?:\s|$)/);
  });

  it("opens kit tooltips on tap instead of long-press", () => {
    expect(BUILD_KIT_TOOLTIP_TRIGGER).toBe("tap");
  });

  it("keeps Held → Moves → Battle → Emblems order from sm and up", () => {
    const { held, moves, battle, emblems } = BUILD_KIT_SECTION_CLASS;
    expect(smOrder(held)).toBe(1);
    expect(smOrder(moves)).toBe(2);
    expect(smOrder(battle)).toBe(3);
    expect(smOrder(emblems)).toBe(4);
    expect(moves).toMatch(/sm:w-auto/);
    expect(emblems).toMatch(/sm:w-auto/);
  });
});
