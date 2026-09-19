import { describe, expect, it } from "vitest";
import { ALL_EMBLEM_COLORS } from "../colors";
import { emblemSetGlyphAsset } from "../emblemIcon";

describe("emblemSetGlyphAsset", () => {
  it("maps navy to the pokedex-sibling sets path", () => {
    expect(emblemSetGlyphAsset("navy")).toBe("/assets/emblems/sets/Navy.png");
  });

  it("maps all eleven colors to distinct capitalized filenames", () => {
    const paths = ALL_EMBLEM_COLORS.map(emblemSetGlyphAsset);
    expect(new Set(paths).size).toBe(11);
    for (const color of ALL_EMBLEM_COLORS) {
      const capitalized = color.charAt(0).toUpperCase() + color.slice(1);
      expect(emblemSetGlyphAsset(color)).toBe(`/assets/emblems/sets/${capitalized}.png`);
    }
  });
});
