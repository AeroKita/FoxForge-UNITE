import { describe, expect, it } from "vitest";
import type { Ability, Move, Pokemon } from "../types";
import {
  clipPreloadGate,
  clipVideoUrls,
  imagesBlockingClipPreload,
  resolveClipSrc,
} from "./moveClipPreload";

function move(partial: Partial<Move> & Pick<Move, "id" | "name">): Move {
  return {
    slot: "move1",
    description: "",
    cooldownSeconds: 0,
    damageInstances: [],
    effects: [],
    tags: [],
    ...partial,
  };
}

function ability(partial: Partial<Ability> & Pick<Ability, "id" | "name">): Ability {
  return { description: "", effects: [], ...partial };
}

describe("clipVideoUrls", () => {
  it("collects every move and passive clip once, including extras", () => {
    const pokemon = {
      moves: [
        move({ id: "a", name: "A", videoAsset: "/assets/skills/A.mp4" }),
        move({ id: "b", name: "B", videoAsset: "/assets/skills/A.mp4" }),
        move({ id: "c", name: "C" }),
      ],
      passiveAbility: ability({
        id: "p",
        name: "P",
        videoAsset: "/assets/skills/P.mp4",
      }),
      extraPassives: [
        ability({ id: "e", name: "E", videoAsset: "/assets/skills/E.mp4" }),
        ability({ id: "e2", name: "E2" }),
      ],
    } as Pick<Pokemon, "moves" | "passiveAbility" | "extraPassives">;

    expect(clipVideoUrls(pokemon)).toEqual([
      "/assets/skills/A.mp4",
      "/assets/skills/P.mp4",
      "/assets/skills/E.mp4",
    ]);
  });
});

describe("clipPreloadGate", () => {
  it("waits for the page load event on the first visit", () => {
    expect(clipPreloadGate({ pageLoaded: false, blockingImages: 0 })).toBe("wait");
  });

  it("waits until the new view's started images finish", () => {
    expect(clipPreloadGate({ pageLoaded: true, blockingImages: 2 })).toBe("wait");
  });

  it("is ready after load when no started image is still loading", () => {
    expect(clipPreloadGate({ pageLoaded: true, blockingImages: 0 })).toBe("ready");
  });
});

describe("resolveClipSrc", () => {
  it("plays a warmed clip from the preloaded copy", () => {
    expect(resolveClipSrc("blob:surf", "/Surf.mp4")).toBe("blob:surf");
  });

  it("uses the asset URL until the preload copy exists", () => {
    expect(resolveClipSrc(undefined, "/Surf.mp4")).toBe("/Surf.mp4");
  });
});

describe("imagesBlockingClipPreload", () => {
  it("ignores complete images and lazy images the browser has not started", () => {
    expect(
      imagesBlockingClipPreload([
        { complete: true, loading: "eager", currentSrc: "/a.png" },
        { complete: false, loading: "lazy", currentSrc: "" },
        { complete: false, loading: "eager", currentSrc: "" },
        { complete: false, loading: "lazy", currentSrc: "/b.png" },
      ]),
    ).toBe(2);
  });
});
