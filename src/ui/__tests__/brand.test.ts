import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  LEGAL_DATA_ATTRIBUTION,
  PAGES_BASE_PATH,
  PAGES_DATA_BASE,
  SITE_HOST,
  SITE_ORIGIN,
} from "../brand";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

describe("hosted site URLs", () => {
  it("serves the Pages build at the custom-domain root", () => {
    expect(SITE_HOST).toBe("foxforge-unite.com");
    expect(SITE_ORIGIN).toBe("https://foxforge-unite.com");
    expect(PAGES_BASE_PATH).toBe("/");
    expect(PAGES_DATA_BASE).toBe("https://foxforge-unite.com/data");
  });

  it("keeps the Pages build base, CNAME, and data origin in lockstep", () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
      scripts: { "build:pages": string };
    };
    expect(pkg.scripts["build:pages"]).toContain(`VITE_BASE=${PAGES_BASE_PATH}`);

    const cname = readFileSync(join(REPO_ROOT, "public", "CNAME"), "utf8").trim();
    expect(cname).toBe(SITE_HOST);
  });
});

describe("Legal data attribution", () => {
  it("credits Unite-DB and in-game text, not Serebii", () => {
    expect(LEGAL_DATA_ATTRIBUTION).toContain("Some data from the amazing Unite-DB team");
    expect(LEGAL_DATA_ATTRIBUTION).not.toContain("Most data is from");
    expect(LEGAL_DATA_ATTRIBUTION).toContain("All values verified against official in-game text");
    expect(LEGAL_DATA_ATTRIBUTION).toContain("Attack-speed model from Mathcord");
    expect(LEGAL_DATA_ATTRIBUTION).not.toMatch(/serebii/i);
    expect(LEGAL_DATA_ATTRIBUTION).not.toMatch(/game8/i);
    expect(LEGAL_DATA_ATTRIBUTION).not.toContain("Some values verified");
  });
});
