import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StatPanel } from "../StatPanel";

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

describe("Advanced Builds stat cards", () => {
  const html = renderToStaticMarkup(createElement(StatPanel));

  it("puts Combat Analytics under Effective Stats and above Attack Speed", () => {
    const effective = html.indexOf("Effective Stats");
    const analytics = html.indexOf("Combat Analytics");
    const attackSpeed = html.indexOf("Attack Speed");
    const effects = html.indexOf("Active Effects");
    expect(effective).toBeGreaterThanOrEqual(0);
    expect(effective).toBeLessThan(analytics);
    expect(analytics).toBeLessThan(attackSpeed);
    expect(attackSpeed).toBeLessThan(effects);
  });

  it("describes Basic ATK/s as a build comparison and drops the damage disclaimer", () => {
    expect(html).toContain("for comparing builds.");
    expect(html).not.toContain("in-game damage");
  });

  it("points Active Effects at the Effective Stats and Stats Charts cards", () => {
    expect(html).toContain("Effective Stats and Stats Charts.");
    expect(html).not.toContain("level charts");
  });
});
