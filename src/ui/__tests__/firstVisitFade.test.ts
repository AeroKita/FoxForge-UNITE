import { describe, expect, it } from "vitest";
import {
  FIRST_VISIT_FADE_CLASS,
  FIRST_VISIT_FADE_MS,
  firstVisitFadeStyle,
  firstVisitShellClass,
} from "../firstVisitFade";

describe("first-visit shell fade", () => {
  it("fades the Select a Pokémon page for 2 seconds when no Pokémon is selected", () => {
    expect(FIRST_VISIT_FADE_MS).toBe(2000);
    expect(FIRST_VISIT_FADE_CLASS).toBe("first-visit-fade");
    expect(firstVisitShellClass(null, "build")).toBe("first-visit-fade");
    expect(firstVisitFadeStyle(null, "build")).toEqual({ animationDuration: "2000ms" });
  });

  it("skips the fade when a Pokémon is already selected", () => {
    expect(firstVisitShellClass("pikachu", "build")).toBeUndefined();
    expect(firstVisitFadeStyle("pikachu", "build")).toBeUndefined();
  });

  it("skips the fade when the first screen is not the Select a Pokémon page", () => {
    expect(firstVisitShellClass(null, "items")).toBeUndefined();
    expect(firstVisitFadeStyle(null, "optimize")).toBeUndefined();
    expect(firstVisitShellClass(null, "emblems")).toBeUndefined();
    expect(firstVisitFadeStyle(null, "compare")).toBeUndefined();
  });
});
