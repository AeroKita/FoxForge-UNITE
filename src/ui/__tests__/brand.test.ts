import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  APP_DESCRIPTION,
  APP_NAME,
  DOCUMENT_TITLE,
  jsonLdGraph,
  LEGAL_DATA_ATTRIBUTION,
  OG_IMAGE_FILE,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  PAGES_BASE_PATH,
  PAGES_DATA_BASE,
  robotsTxt,
  SITE_HOST,
  SITE_ORIGIN,
  sitemapXml,
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
    expect(html).toContain(`<meta property="og:title" content="${DOCUMENT_TITLE}" />`);
    expect(html).toContain(`<meta property="og:description" content="${APP_DESCRIPTION}" />`);
    expect(html).toContain(`<meta property="og:url" content="${SITE_ORIGIN}/" />`);
    expect(html).toContain(`<meta property="og:locale" content="en_US" />`);
    expect(html).toContain(`<meta property="og:image" content="${OG_IMAGE_URL}" />`);
    expect(html).toContain(`<meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />`);
    expect(html).toContain(`<meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />`);
    expect(html).toContain(`<meta property="og:image:alt" content="${APP_NAME}" />`);
    expect(html).toContain(`<meta name="twitter:card" content="summary_large_image" />`);
    expect(html).toContain(`<meta name="twitter:title" content="${DOCUMENT_TITLE}" />`);
    expect(html).toContain(`<meta name="twitter:description" content="${APP_DESCRIPTION}" />`);
    expect(html).toContain(`<meta name="twitter:image" content="${OG_IMAGE_URL}" />`);
    expect(html).toContain(`<meta name="twitter:image:alt" content="${APP_NAME}" />`);
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/" />`);
    expect(html).toContain(
      `<script type="application/ld+json">${JSON.stringify(jsonLdGraph())}</script>`,
    );
  });

  it("describes a free Pokémon UNITE web app in JSON-LD", () => {
    const graph = jsonLdGraph();
    expect(graph["@context"]).toBe("https://schema.org");
    expect(graph["@type"]).toBe("WebApplication");
    expect(graph.name).toBe(APP_NAME);
    expect(graph.alternateName).toBe(DOCUMENT_TITLE);
    expect(graph.url).toBe(`${SITE_ORIGIN}/`);
    expect(graph.description).toBe(APP_DESCRIPTION);
    expect(graph.applicationCategory).toBe("GameApplication");
    expect(graph.operatingSystem).toBe("Any");
    expect(graph.image).toBe(OG_IMAGE_URL);
    expect(graph.inLanguage).toBe("en");
    expect(graph.isAccessibleForFree).toBe(true);
    expect(graph.offers).toEqual({
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    });
  });

  it("uses the search-oriented title and description", () => {
    expect(DOCUMENT_TITLE).toBe("FoxForge UNITE | Pokémon UNITE Build Optimizer");
    expect(APP_DESCRIPTION).toBe(
      "Plan Pokémon UNITE builds: Held Items, Battle Items, and Emblems with live stats. For casual and veteran Trainers!",
    );
  });

  it("points robots.txt and sitemap.xml at the custom-domain origin", () => {
    expect(robotsTxt()).toContain("User-agent: *");
    expect(robotsTxt()).toContain("Allow: /");
    expect(robotsTxt()).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
    expect(sitemapXml()).toContain(`<loc>${SITE_ORIGIN}/</loc>`);

    const robotsFile = readFileSync(join(REPO_ROOT, "public", "robots.txt"), "utf8");
    const sitemapFile = readFileSync(join(REPO_ROOT, "public", "sitemap.xml"), "utf8");
    expect(robotsFile).toBe(robotsTxt());
    expect(sitemapFile).toBe(sitemapXml());
  });

  it("keeps a crawler-visible h1 and document title in the HTML shell", () => {
    const indexHtml = readFileSync(join(REPO_ROOT, "index.html"), "utf8");
    expect(indexHtml).toContain("<title>__DOCUMENT_TITLE__</title>");
    expect(indexHtml).toMatch(/<h1\b[^>]*>__DOCUMENT_TITLE__<\/h1>/);
    expect(indexHtml).toContain("<noscript>");
    expect(indexHtml).toContain("__APP_DESCRIPTION__");

    const viteConfig = readFileSync(join(REPO_ROOT, "vite.config.ts"), "utf8");
    expect(viteConfig).toContain('replaceAll("__DOCUMENT_TITLE__", DOCUMENT_TITLE)');
    expect(viteConfig).toContain('replaceAll("__APP_DESCRIPTION__", APP_DESCRIPTION)');
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
