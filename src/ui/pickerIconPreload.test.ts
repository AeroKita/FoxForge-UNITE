import { describe, expect, it } from "vitest";
import {
  PICKER_ICON_WARM_CONCURRENCY,
  pickerIconPaths,
  pickerIconWarmupGate,
} from "./pickerIconPreload";

describe("pickerIconPaths", () => {
  it("keeps roster order and drops blank or repeated icon paths", () => {
    expect(
      pickerIconPaths([
        { iconAsset: "/assets/pokemon/thumbnail/Absol.png" },
        { iconAsset: "  " },
        { iconAsset: "/assets/pokemon/thumbnail/Absol.png" },
        { iconAsset: "" },
        { iconAsset: "/assets/pokemon/thumbnail/Pikachu.png" },
        {},
      ]),
    ).toEqual(["/assets/pokemon/thumbnail/Absol.png", "/assets/pokemon/thumbnail/Pikachu.png"]);
  });
});

describe("pickerIconWarmupGate", () => {
  it("skips the queue on save-data even when the page is idle", () => {
    expect(pickerIconWarmupGate({ pageLoaded: true, blockingImages: 0, saveData: true })).toBe(
      "skip",
    );
  });

  it("waits for the load event and for images the view has already started", () => {
    expect(pickerIconWarmupGate({ pageLoaded: false, blockingImages: 0, saveData: false })).toBe(
      "wait",
    );
    expect(pickerIconWarmupGate({ pageLoaded: true, blockingImages: 3, saveData: false })).toBe(
      "wait",
    );
  });

  it("is ready once the page is loaded and no started image is still loading", () => {
    expect(pickerIconWarmupGate({ pageLoaded: true, blockingImages: 0, saveData: false })).toBe(
      "ready",
    );
  });
});

describe("PICKER_ICON_WARM_CONCURRENCY", () => {
  it("warms one thumbnail at a time", () => {
    expect(PICKER_ICON_WARM_CONCURRENCY).toBe(1);
  });
});
