import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LevelGraph } from "../LevelGraph";

vi.mock("../../state/store", () => ({
  useStore: () => ({
    loadout: {
      pokemonId: "lucario",
      level: 15,
      heldItemIds: [null, null, null],
      battleItemId: null,
      move1Id: null,
      move2Id: null,
      emblems: [],
      activeBoostIds: [],
    },
    dispatch: () => {},
    expert: true,
    heldSlotGrades: [40, 40, 40],
  }),
}));

function metricGroup(html: string): string {
  const start = html.indexOf('aria-label="Chart metric"');
  expect(start).toBeGreaterThanOrEqual(0);
  const open = html.lastIndexOf("<div", start);
  const close = html.indexOf("</div>", start);
  return html.slice(open, close + "</div>".length);
}

describe("Stats Charts metric row", () => {
  const html = renderToStaticMarkup(createElement(LevelGraph));
  const group = metricGroup(html);

  it("scrolls the metric pills in one unlabeled row", () => {
    expect(group).toContain("overflow-x-auto");
    expect(group).not.toContain("flex-wrap");
    expect(group).not.toContain("uppercase");
  });

  it("keeps each pill from shrinking", () => {
    const buttons = group.match(/<button\b[^>]*>/g) ?? [];
    expect(buttons.length).toBeGreaterThan(1);
    for (const button of buttons) {
      expect(button).toContain("shrink-0");
    }
  });

  it("places Atk Speed immediately left of Attacks/sec", () => {
    const labels = [...group.matchAll(/<button\b[^>]*>([^<]+)<\/button>/g)].map((m) => m[1]);
    expect(labels[labels.indexOf("Attacks/sec") - 1]).toBe("Atk Speed");
  });
});
