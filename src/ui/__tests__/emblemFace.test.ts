import { describe, it, expect } from "vitest";
import { GRADE_LETTER } from "../colors";
import { emblemFaceOverlays } from "../emblemFace";
import type { EmblemColor } from "../../types";

describe("emblemFaceOverlays", () => {
  it("renders a color-dot overlay for each emblem color", () => {
    const colors: EmblemColor[] = ["brown", "white"];
    expect(emblemFaceOverlays(colors)).toEqual([
      { kind: "color-dot", color: "brown" },
      { kind: "color-dot", color: "white" },
    ]);
  });

  it("does not include G/B/S/P grade-letter chips", () => {
    const overlays = emblemFaceOverlays(["brown", "green", "blue"]);
    expect(overlays.every((o) => o.kind === "color-dot")).toBe(true);
    const letters = Object.values(GRADE_LETTER);
    const serialized = JSON.stringify(overlays);
    for (const letter of letters) {
      expect(serialized).not.toContain(`"${letter}"`);
    }
  });
});
