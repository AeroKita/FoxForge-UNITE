import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  TabBar,
  tabBarCompareItemClass,
  tabBarCompareSlotClass,
  tabBarTrackClass,
  type Tab,
} from "../shell/TabBar";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "build", label: "Build", icon: "B" },
  { id: "optimize", label: "Optimize", icon: "O" },
  { id: "emblems", label: "Emblems", icon: "E" },
  { id: "items", label: "Items", icon: "I" },
  { id: "compare", label: "Compare", icon: "C" },
];

describe("tabBarTrackClass", () => {
  it("keeps five columns so Compare can grow from 0fr instead of mounting", () => {
    const basic = tabBarTrackClass(false);
    const advanced = tabBarTrackClass(true);
    expect(basic).toContain("grid-cols-[1fr_1fr_1fr_1fr_0fr]");
    expect(basic).not.toContain("grid-cols-[1fr_1fr_1fr_1fr_1fr]");
    expect(advanced).toContain("grid-cols-[1fr_1fr_1fr_1fr_1fr]");
    expect(advanced).not.toContain("grid-cols-[1fr_1fr_1fr_1fr_0fr]");
    for (const track of [basic, advanced]) {
      expect(track).toContain("grid");
      expect(track).toContain("motion-safe:transition-[grid-template-columns]");
      expect(track).toContain("motion-safe:duration-300");
    }
  });
});

describe("tabBarCompareSlotClass", () => {
  it("clips Compare while the column is closed so neighbors are not overlapped", () => {
    expect(tabBarCompareSlotClass(false)).toContain("overflow-hidden");
    expect(tabBarCompareSlotClass(true)).toContain("overflow-hidden");
  });
});

describe("tabBarCompareItemClass", () => {
  it("fades and slides Compare in after the slot starts opening, and out before it closes", () => {
    const shown = tabBarCompareItemClass(true);
    const hidden = tabBarCompareItemClass(false);
    expect(shown).toContain("opacity-100");
    expect(shown).toContain("translate-x-0");
    expect(shown).toContain("scale-100");
    expect(shown).toContain("motion-safe:duration-300");
    expect(shown).toContain("motion-safe:delay-75");
    expect(hidden).toContain("opacity-0");
    expect(hidden).toContain("translate-x-2");
    expect(hidden).toContain("scale-[0.92]");
    expect(hidden).toContain("motion-safe:duration-150");
    expect(hidden).not.toContain("motion-safe:delay-75");
    for (const item of [shown, hidden]) {
      expect(item).toContain("motion-safe:transition-[opacity,transform]");
    }
  });
});

describe("TabBar Compare slot", () => {
  it("keeps Compare mounted and inert in Basic so Advanced can animate it in", () => {
    const html = renderToStaticMarkup(
      createElement(TabBar, {
        active: "build",
        onChange: () => {},
        tabs: TABS,
        compareVisible: false,
      }),
    );
    expect(html).toContain("Compare");
    expect(html).toContain("grid-cols-[1fr_1fr_1fr_1fr_0fr]");
    expect(html).toMatch(/inert/);
    expect(html).toContain('tabindex="-1"');
    expect(html).toMatch(/<button[^>]*aria-hidden="true"[^>]*tabindex="-1"/);
  });

  it("opens the Compare column and restores the tab in Advanced", () => {
    const html = renderToStaticMarkup(
      createElement(TabBar, {
        active: "compare",
        onChange: () => {},
        tabs: TABS,
        compareVisible: true,
      }),
    );
    expect(html).toContain("Compare");
    expect(html).toContain("grid-cols-[1fr_1fr_1fr_1fr_1fr]");
    expect(html).not.toMatch(/inert/);
    expect(html).not.toContain('tabindex="-1"');
    expect(html).toMatch(/aria-selected="true"[^>]*>[\s\S]*Compare/);
  });
});
