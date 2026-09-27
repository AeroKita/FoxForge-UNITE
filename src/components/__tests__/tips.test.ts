import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { descriptionOnlyTip, emblemTip, itemTip, moveTip, pickDescription } from "../tips";
import { HeldItemDetailBody } from "../../ui/heldItemDetail";
import type { HeldItem } from "../../types";
import { activeTooltipMedia } from "../../ui/tooltipMedia";
import { makeEmblem } from "../../engine/__tests__/fixtures";
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

const scopeLens: HeldItem = {
  id: "scope-lens",
  displayName: "Scope Lens",
  iconAsset: "/assets/items/held/Scope+Lens.png",
  description:
    "Increases the damage of basic attack critical hits. The higher the Pokémon's Attack, the more the damage increases.",
  descriptionAdvanced:
    "Upon dealing a critical hit with an auto attack: deals an additional hit of damage equal to 45/60/75% Attack to 1 target (1s CD).",
  statsByGrade: { 40: { critRate: 0.07, critDamage: 0.14 } },
  conditionalEffects: [],
};

describe("itemTip", () => {
  it("shows the in-game description in Basic mode", () => {
    const html = markup(itemTip(scopeLens, 40, false) as ReactElement | null);
    expect(html).toContain("basic attack critical hits");
    expect(html).not.toContain("45/60/75%");
    expect(html).toContain("Crit Damage +14%");
  });

  it("shows the UNITE-DB description in Advanced mode", () => {
    const html = markup(itemTip(scopeLens, 40, true) as ReactElement | null);
    expect(html).toContain("45/60/75% Attack");
    expect(html).not.toContain("basic attack critical hits");
  });
});

describe("HeldItemDetailBody", () => {
  const lens = {
    ...scopeLens,
    effect: { label: "Of Attack Stat", tiers: ["45%", "60%", "75%"] as [string, string, string] },
  };

  it("keeps the attack-percent tiers off the Basic card", () => {
    const html = markup(HeldItemDetailBody({ item: lens, grade: 40, advanced: false }));
    expect(html).toContain("basic attack critical hits");
    expect(html).toContain("Crit Damage +14%");
    expect(html).not.toContain("Of Attack Stat");
  });

  it("shows the UNITE-DB tiers on the Advanced card", () => {
    const html = markup(HeldItemDetailBody({ item: lens, grade: 40, advanced: true }));
    expect(html).toContain("45/60/75% Attack");
    expect(html).toContain("Of Attack Stat");
    expect(html).toContain("75%");
  });
});

describe("descriptionOnlyTip", () => {
  it("shows the bold title it is given and leaves the description unchanged", () => {
    const html = markup(
      descriptionOnlyTip({ ...attack, name: "Basic Attack" }, false) as ReactElement | null,
    );
    expect(html).toContain('class="font-semibold">Basic Attack');
    expect(html).toContain("Becomes a boosted attack");
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

  it("does not mount a clip video until the tooltip is showing it", () => {
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
    expect(html).toContain('class="font-semibold">Turboblaze');
    expect(html).toContain("Boosts movement speed.");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("<img");
  });

  it("plays the clip and not the icon when the tooltip is active", () => {
    const html = markup(
      activeTooltipMedia(
        descriptionOnlyTip(
          {
            name: "Turboblaze",
            description: "Boosts movement speed.",
            videoAsset: "/assets/skills/Reshiram/Turboblaze.mp4",
            iconAsset: "/assets/skills/Reshiram/Turboblaze.png",
            gifAsset: "/assets/skills/Reshiram/Turboblaze.webp",
          },
          false,
        ) as ReactElement,
      ),
    );
    expect(html).toContain("<video");
    expect(html).toContain("autoPlay");
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

describe("emblemTip", () => {
  const emblem = makeEmblem("Pikachu", ["yellow"], {});
  emblem.statsByGrade = {
    bronze: { hp: 6 },
    silver: { hp: 12 },
    gold: { hp: 24 },
  };

  it("builds each grade's tooltip once and keeps the same text", () => {
    const first = emblemTip(emblem, "gold");
    const second = emblemTip(emblem, "gold");
    expect(second).toBe(first);
    const html = markup(first as ReactElement);
    expect(html).toContain("Pikachu");
    expect(html).toContain("gold");
    expect(html).toContain("24");
    expect(markup(emblemTip(emblem, "bronze") as ReactElement)).toContain("6");
  });
});
