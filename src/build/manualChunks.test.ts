import { describe, expect, it } from "vitest";
import { productionManualChunk } from "./manualChunks";

describe("productionManualChunk", () => {
  it("keeps the patch bundle in its own chunk", () => {
    expect(productionManualChunk("/src/data/patch-current.json")).toBe("game-data");
  });

  it("does not force recharts, d3, or victory-vendor into a shared chunk", () => {
    expect(productionManualChunk("/node_modules/recharts/es6/chart/LineChart.js")).toBeUndefined();
    expect(productionManualChunk("/node_modules/d3-shape/src/index.js")).toBeUndefined();
    expect(productionManualChunk("/node_modules/victory-vendor/d3-scale.js")).toBeUndefined();
  });

  it("leaves React on the default graph so the entry does not import a charts chunk", () => {
    expect(productionManualChunk("/node_modules/react/index.js")).toBeUndefined();
    expect(productionManualChunk("/node_modules/react-dom/client.js")).toBeUndefined();
    expect(productionManualChunk("/node_modules/use-sync-external-store/shim.js")).toBeUndefined();
  });
});
