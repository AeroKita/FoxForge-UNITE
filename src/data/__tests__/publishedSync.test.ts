import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import baseline from "../patch-current.json";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");
const PUBLIC_DATA = join(REPO_ROOT, "public", "data");

describe("published bundle sync", () => {
  it("published copy and manifest match the build-time baseline", () => {
    const { patchVersion: PATCH, lastUpdated: VER } = baseline;
    const publishedPath = join(PUBLIC_DATA, `patch-${PATCH}.json`);
    const manifestPath = join(PUBLIC_DATA, "manifest.json");

    const published = JSON.parse(readFileSync(publishedPath, "utf8"));
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    expect(published).toEqual(baseline);
    expect(manifest).toEqual({
      version: VER,
      patchVersion: PATCH,
      url: `https://foxforge-unite.com/data/patch-${PATCH}.json`,
    });
  });
});
