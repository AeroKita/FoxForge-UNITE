import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  MAIN_TABS,
  TabBar,
  tabBarAdvancedItemClass,
  tabBarAdvancedSlotClass,
  tabBarTrackClass,
  tabForMode,
  type Tab,
} from "../shell/TabBar";

function classSet(value: string): Set<string> {
  return new Set(value.split(/\s+/).filter(Boolean));
}

function tabLabels(html: string): string[] {
  return [...html.matchAll(/<span[^>]*>([^<]+)<\/span>/g)].map((match) => match[1]);
}

describe("MAIN_TABS", () => {
  it("orders Builds, Emblems, and Items ahead of the Advanced-only tabs", () => {
    expect(MAIN_TABS.map((tab) => tab.id)).toEqual([
      "build",
      "emblems",
      "items",
      "compare",
      "optimize",
    ]);
    expect(MAIN_TABS.map((tab) => tab.label)).toEqual([
      "Builds",
      "Emblems",
      "Items",
      "Compare",
      "Optimize",
    ]);
  });
});

describe("tabForMode", () => {
  it("keeps Compare and Optimize in Advanced and sends both back to Builds in Basic", () => {
    const advanced: Tab[] = ["build", "emblems", "items", "compare", "optimize"];
    for (const tab of advanced) {
      expect(tabForMode(true, tab)).toBe(tab);
    }
    expect(tabForMode(false, "compare")).toBe("build");
    expect(tabForMode(false, "optimize")).toBe("build");
    expect(tabForMode(false, "build")).toBe("build");
    expect(tabForMode(false, "emblems")).toBe("emblems");
    expect(tabForMode(false, "items")).toBe("items");
  });
});

describe("tabBarTrackClass", () => {
  it("uses a flex track so Compare and Optimize can grow on their own delays", () => {
    const track = tabBarTrackClass();
    expect(classSet(track)).toContain("flex");
    expect(track).not.toContain("grid-cols-");
  });
});

describe("tabBarAdvancedSlotClass", () => {
  it("opens Compare immediately and Optimize 150ms later", () => {
    const compare = classSet(tabBarAdvancedSlotClass("compare", true));
    const optimize = classSet(tabBarAdvancedSlotClass("optimize", true));
    expect(compare).toContain("grow");
    expect(compare).not.toContain("grow-0");
    expect(compare).toContain("motion-safe:delay-0");
    expect(optimize).toContain("grow");
    expect(optimize).not.toContain("grow-0");
    expect(optimize).toContain("motion-safe:delay-150");
    for (const slot of [compare, optimize]) {
      expect(slot).toContain("overflow-hidden");
      expect(slot).toContain("basis-0");
      expect(slot).toContain("motion-safe:transition-[flex-grow]");
      expect(slot).toContain("motion-safe:duration-300");
    }
  });

  it("closes Optimize immediately and Compare 150ms later", () => {
    const compare = classSet(tabBarAdvancedSlotClass("compare", false));
    const optimize = classSet(tabBarAdvancedSlotClass("optimize", false));
    expect(optimize).toContain("grow-0");
    expect(optimize).toContain("motion-safe:delay-0");
    expect(optimize).not.toContain("motion-safe:delay-150");
    expect(compare).toContain("grow-0");
    expect(compare).toContain("motion-safe:delay-150");
    expect(compare).toContain("pointer-events-none");
    expect(optimize).toContain("pointer-events-none");
  });
});

describe("tabBarAdvancedItemClass", () => {
  it("fades and slides each Advanced tab in after its column starts opening", () => {
    const compare = tabBarAdvancedItemClass("compare", true);
    const optimize = tabBarAdvancedItemClass("optimize", true);
    expect(compare).toContain("opacity-100");
    expect(compare).toContain("translate-x-0");
    expect(compare).toContain("scale-100");
    expect(compare).toContain("motion-safe:duration-300");
    expect(compare).toContain("motion-safe:delay-75");
    expect(optimize).toContain("opacity-100");
    expect(optimize).toContain("translate-x-0");
    expect(optimize).toContain("scale-100");
    expect(optimize).toContain("motion-safe:duration-300");
    expect(optimize).toContain("motion-safe:delay-[225ms]");
    expect(optimize).not.toContain("motion-safe:delay-75");
    for (const item of [compare, optimize]) {
      expect(item).toContain("motion-safe:transition-[opacity,transform]");
    }
  });

  it("fades Optimize out first, then Compare, faster than the column closes", () => {
    const compare = tabBarAdvancedItemClass("compare", false);
    const optimize = tabBarAdvancedItemClass("optimize", false);
    expect(optimize).toContain("opacity-0");
    expect(optimize).toContain("translate-x-2");
    expect(optimize).toContain("scale-[0.92]");
    expect(optimize).toContain("motion-safe:duration-150");
    expect(optimize).not.toContain("motion-safe:delay-");
    expect(compare).toContain("opacity-0");
    expect(compare).toContain("translate-x-2");
    expect(compare).toContain("scale-[0.92]");
    expect(compare).toContain("motion-safe:duration-150");
    expect(compare).toContain("motion-safe:delay-150");
    expect(compare).not.toContain("motion-safe:delay-75");
  });
});

describe("TabBar Advanced slots", () => {
  it("keeps Compare and Optimize mounted and inert in Basic", () => {
    const html = renderToStaticMarkup(
      createElement(TabBar, {
        active: "optimize",
        onChange: () => {},
        tabs: MAIN_TABS,
        advancedVisible: false,
      }),
    );
    expect(tabLabels(html)).toEqual(["Builds", "Emblems", "Items", "Compare", "Optimize"]);
    expect(html.match(/inert/g)).toHaveLength(2);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(2);
    expect(html.match(/<button[^>]*aria-hidden="true"/g)).toHaveLength(2);
    expect(html).not.toContain('aria-selected="true"');
  });

  it("opens both Advanced tabs and selects Optimize", () => {
    const html = renderToStaticMarkup(
      createElement(TabBar, {
        active: "optimize",
        onChange: () => {},
        tabs: MAIN_TABS,
        advancedVisible: true,
      }),
    );
    expect(tabLabels(html)).toEqual(["Builds", "Emblems", "Items", "Compare", "Optimize"]);
    expect(html).not.toMatch(/inert/);
    expect(html).not.toContain('tabindex="-1"');
    expect(html).toMatch(/aria-selected="true"[^>]*>[\s\S]*Optimize/);
  });
});
