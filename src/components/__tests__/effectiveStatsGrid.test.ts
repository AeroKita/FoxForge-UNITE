import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { deriveBuild } from "../../engine/derive";
import { emptyLoadout } from "../../state/loadout";
import { EffectiveStatsGrid, MoveSpeedSofteningMark, SplitSpeedCells } from "../EffectiveStatsGrid";

const mode = vi.hoisted(() => ({ expert: false }));

vi.mock("../../state/store", () => ({
  useStore: () => ({ expert: mode.expert }),
}));

describe("EffectiveStatsGrid", () => {
  it("does not print the set-bonus footnote", () => {
    const derived = deriveBuild(
      {
        ...emptyLoadout("lucario"),
        emblems: [
          { emblemId: "025-pikachu", grade: "gold" },
          { emblemId: "026-raichu", grade: "gold" },
          { emblemId: "081-magnemite", grade: "gold" },
        ],
      },
      true,
      [40, 40, 40],
    );
    expect(derived.emblemLoadout.activeSetBonuses.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(createElement(EffectiveStatsGrid, { derived }));
    expect(html).not.toContain("Set bonuses:");
  });
});

describe("SplitSpeedCells", () => {
  const html = renderToStaticMarkup(
    createElement(SplitSpeedCells, {
      inCombat: 4295,
      noCombat: 5576.8,
      inDelta: 595,
      noDelta: 1876.8,
      inBuffed: false,
    }),
  );

  it("labels the second speed out of combat", () => {
    expect(html).toContain("Speed out of combat");
    expect(html).toContain("Speed in combat");
    expect(html).not.toContain("no combat");
  });

  it("gives each speed the full row so a long figure cannot cover the label", () => {
    const faces = html.match(/col-span-full/g) ?? [];
    expect(faces.length).toBeGreaterThanOrEqual(2);
    expect(html).not.toContain("whitespace-nowrap");
    expect(html).toContain("min-w-0");
  });
});

describe("MoveSpeedSofteningMark", () => {
  it("puts the Basic above-5,000 note on the trigger", () => {
    mode.expert = false;
    const html = renderToStaticMarkup(createElement(MoveSpeedSofteningMark, { speed: 5576.8 }));
    expect(html).toContain("Above 5,000, extra Speed has a reduced effect.");
    expect(html).not.toContain("5,700");
  });

  it("puts both Advanced thresholds on the trigger", () => {
    mode.expert = true;
    const html = renderToStaticMarkup(createElement(MoveSpeedSofteningMark, { speed: 5576.8 }));
    expect(html).toContain(
      "Movement Speed gains are reduced above 5,000 (80%) and again above 5,700 (50%).",
    );
  });

  it("puts the below-2,500 explanation on the trigger", () => {
    const html = renderToStaticMarkup(createElement(MoveSpeedSofteningMark, { speed: 1250 }));
    expect(html).toContain("2,500");
    expect(html).toContain("higher than the raw total");
  });

  it("renders nothing inside the unchanged band", () => {
    expect(renderToStaticMarkup(createElement(MoveSpeedSofteningMark, { speed: 3000 }))).toBe("");
  });

  it("fills the question mark with the same raised disc as the Emblems hub", () => {
    const html = renderToStaticMarkup(createElement(MoveSpeedSofteningMark, { speed: 5576.8 }));
    const button = html.match(/<button[^>]*>/)?.[0] ?? "";
    expect(button).toContain("bg-raise");
  });
});
