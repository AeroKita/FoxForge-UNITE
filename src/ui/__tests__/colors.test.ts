import { describe, expect, it } from "vitest";
import { ALL_EMBLEM_COLORS, EMBLEM_SET_UI_HEX } from "../colors";

describe("EMBLEM_SET_UI_HEX", () => {
  it("covers every emblem color with a 6-digit hex", () => {
    for (const color of ALL_EMBLEM_COLORS) {
      expect(EMBLEM_SET_UI_HEX[color]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("uses the in-game / UNITE-DB Equipped Sets fills, not the wheel swatches", () => {
    expect(EMBLEM_SET_UI_HEX.brown).toBe("#FF8C4E");
    expect(EMBLEM_SET_UI_HEX.white).toBe("#DFEEF8");
    expect(EMBLEM_SET_UI_HEX.blue).toBe("#5FB2FF");
    expect(EMBLEM_SET_UI_HEX.purple).toBe("#B872FF");
    expect(EMBLEM_SET_UI_HEX.green).toBe("#7AFA8F");
    expect(EMBLEM_SET_UI_HEX.red).toBe("#FF6C6C");
    expect(EMBLEM_SET_UI_HEX.yellow).toBe("#F5F761");
    expect(EMBLEM_SET_UI_HEX.black).toBe("#55606C");
    expect(EMBLEM_SET_UI_HEX.pink).toBe("#FFA8FC");
    expect(EMBLEM_SET_UI_HEX.navy).toBe("#577DE9");
    expect(EMBLEM_SET_UI_HEX.gray).toBe("#B0B0B0");
  });
});
