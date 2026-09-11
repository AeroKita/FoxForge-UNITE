import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  APP_DESCRIPTION,
  APP_NAME,
  LEGAL_DATA_ATTRIBUTION,
  OG_IMAGE_FILE,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  PAGES_BASE_PATH,
  PAGES_DATA_BASE,
  SITE_HOST,
  SITE_ORIGIN,
  socialMetaTags,
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

describe("link-preview meta tags", () => {
  it("points og:image at a public file on the custom domain", () => {
    expect(OG_IMAGE_FILE).toBe("og-image.jpg");
    expect(OG_IMAGE_URL).toBe(`${SITE_ORIGIN}/${OG_IMAGE_FILE}`);
    expect(existsSync(join(REPO_ROOT, "public", OG_IMAGE_FILE))).toBe(true);
  });

  it("emits Open Graph and Twitter tags crawlers can read without running the app", () => {
    const html = socialMetaTags();
    expect(html).toContain(`<meta name="description" content="${APP_DESCRIPTION}" />`);
    expect(html).toContain(`<meta property="og:type" content="website" />`);
    expect(html).toContain(`<meta property="og:site_name" content="${APP_NAME}" />`);
    expect(html).toContain(`<meta property="og:title" content="${APP_NAME}" />`);
    expect(html).toContain(`<meta property="og:description" content="${APP_DESCRIPTION}" />`);
    expect(html).toContain(`<meta property="og:url" content="${SITE_ORIGIN}/" />`);
    expect(html).toContain(`<meta property="og:image" content="${OG_IMAGE_URL}" />`);
    expect(html).toContain(`<meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />`);
    expect(html).toContain(`<meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />`);
    expect(html).toContain(`<meta property="og:image:alt" content="${APP_NAME}" />`);
    expect(html).toContain(`<meta name="twitter:card" content="summary_large_image" />`);
    expect(html).toContain(`<meta name="twitter:title" content="${APP_NAME}" />`);
    expect(html).toContain(`<meta name="twitter:description" content="${APP_DESCRIPTION}" />`);
    expect(html).toContain(`<meta name="twitter:image" content="${OG_IMAGE_URL}" />`);
  });

  it("uses the embed description wording", () => {
    expect(APP_DESCRIPTION).toBe(
      "FoxForge UNITE — A Pokémon UNITE tool for casual and veteran Trainers!",
    );
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
