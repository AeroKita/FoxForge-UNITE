import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { setBonuses } from "../../data/gameData";
import type { EmblemColor, EmblemSlot } from "../../types";
import { equippedSetRows } from "../../ui/emblemWheel";
import { EquippedSets, equippedSetDetailTrackClass } from "../EquippedSets";

function slot(name: string, colors: EmblemColor[]): EmblemSlot {
  return {
    emblem: {
      id: name,
      pokemonName: name,
      colors,
      iconAsset: "",
      statsByGrade: { bronze: {}, silver: {}, gold: {} },
    },
    grade: "gold",
  };
}

describe("equippedSetDetailTrackClass", () => {
  it("collapses to 0fr and expands to 1fr over 0.5s ease-out", () => {
    const closed = equippedSetDetailTrackClass(false);
    const opened = equippedSetDetailTrackClass(true);
    expect(closed).toContain("grid-rows-[0fr]");
    expect(closed).not.toContain("grid-rows-[1fr]");
    expect(opened).toContain("grid-rows-[1fr]");
    expect(opened).not.toContain("grid-rows-[0fr]");
    for (const track of [closed, opened]) {
      expect(track).toContain("motion-safe:transition-[grid-template-rows]");
      expect(track).toContain("motion-safe:duration-500");
      expect(track).toContain("motion-safe:ease-out");
    }
  });
});

describe("EquippedSets detail panel", () => {
  it("keeps the bonus mounted and collapsed so open and close can animate", () => {
    const rows = equippedSetRows(
      Array.from({ length: 6 }, (_, i) => slot(`b${i}`, ["brown"])),
      setBonuses,
    );
    const html = renderToStaticMarkup(createElement(EquippedSets, { rows }));
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/id="equipped-set-detail-brown"[^>]*aria-hidden="true"/);
    expect(html).toContain("grid-rows-[0fr]");
    expect(html).toContain('class="flex flex-col"');
    expect(html).toContain('class="min-h-0 overflow-hidden"');
    expect(html).not.toContain("p-px");
    expect(html).toContain("+4% Atk");
  });
});
