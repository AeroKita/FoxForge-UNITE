import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { descriptionOnlyTip, moveTip, pickDescription } from "../tips";
import type { Move } from "../../types";

function markup(node: ReactElement | null): string {
  return renderToStaticMarkup(node);
}

describe("pickDescription", () => {
  const d = {
    description: "Basic text",
    descriptionAdvanced: "Advanced text",
  };

  it("returns description when advanced mode is off", () => {
    expect(pickDescription(d, false)).toBe("Basic text");
  });

  it("returns descriptionAdvanced when advanced mode is on and present", () => {
    expect(pickDescription(d, true)).toBe("Advanced text");
  });

  it("falls back to description when advanced mode is on but descriptionAdvanced is absent", () => {
    expect(pickDescription({ description: "Basic only" }, true)).toBe("Basic only");
  });
});

const attack: Move = {
  id: "attack",
  name: "Attack",
  slot: "basicAttack",
  description: "Becomes a boosted attack with every third attack.",
  descriptionAdvanced: "Defense down 15% for 2s.",
  cooldownSeconds: 0,
  damageInstances: [],
  effects: [],
  tags: [],
  iconAsset: "/assets/skills/basic-attack.png",
  gifAsset: "/assets/skills/unused.webp",
};

describe("descriptionOnlyTip", () => {
  it("shows the Basic description and no still or clip when there is no video", () => {
    const html = markup(descriptionOnlyTip(attack, false) as ReactElement | null);
    expect(html).toContain("Becomes a boosted attack");
    expect(html).not.toContain("Attack");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("basic-attack.png");
    expect(html).not.toContain("unused.webp");
  });

  it("uses the Advanced description when advanced mode is on", () => {
    const html = markup(descriptionOnlyTip(attack, true) as ReactElement | null);
    expect(html).toContain("Defense down 15%");
    expect(html).not.toContain("Becomes a boosted attack");
  });

  it("shows the clip and not the icon when videoAsset is set", () => {
    const html = markup(
      descriptionOnlyTip(
        {
          name: "Turboblaze",
          description: "Boosts movement speed.",
          videoAsset: "/assets/skills/Reshiram/Turboblaze.mp4",
          iconAsset: "/assets/skills/Reshiram/Turboblaze.png",
          gifAsset: "/assets/skills/Reshiram/Turboblaze.webp",
        },
        false,
      ) as ReactElement | null,
    );
    expect(html).toContain("Boosts movement speed.");
    expect(html).toContain("<video");
    expect(html).toContain("Turboblaze.mp4");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("Turboblaze.png");
    expect(html).not.toContain("Turboblaze.webp");
  });
});

describe("moveTip", () => {
  it("still shows the name and icon for a non-basic move", () => {
    const html = markup(
      moveTip(
        {
          ...attack,
          id: "feint",
          name: "Feint",
          slot: "move1",
          iconAsset: "/assets/skills/Absol/Feint.png",
          gifAsset: undefined,
          videoAsset: undefined,
        },
        false,
      ) as ReactElement,
    );
    expect(html).toContain("Feint");
    expect(html).toContain("<img");
    expect(html).toContain("Feint.png");
  });
});
