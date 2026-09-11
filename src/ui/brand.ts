// ---------------------------------------------------------------- branding --
// Single source of truth for the app's name + tagline. The React UI and the
// web build (vite.config.ts → HTML <title> + PWA manifest) both read from here,
// so renaming the app is a one-line change in this file.
//
// A few native/release files can't import TypeScript and must be edited
// alongside this file for a full rename — see docs/08-branding.md for the list
// and the icon-regeneration process.

export const APP_NAME = "FoxForge UNITE";

// Compact form for tight spots (home-screen PWA label, etc.).
export const APP_SHORT_NAME = "FoxForge";

// Reserved slogan (README / branding docs). Not rendered in the app header.
export const APP_TAGLINE = "Forge your UNITE Loadout!";

// Used for the PWA manifest + meta description.
export const APP_DESCRIPTION =
  "FoxForge UNITE — A Pokémon UNITE tool for casual and veteran Trainers!";

// GitHub repo slug + hosted site URLs. Display name stays "FoxForge UNITE";
// the hyphenated slug is for the GitHub repo. The public site is the custom
// domain at the root (`VITE_BASE=/`), not the github.io project path.
export const GITHUB_REPO_SLUG = "FoxForge-UNITE";
export const GITHUB_REPO = `AeroKita/${GITHUB_REPO_SLUG}`;
export const SITE_HOST = "foxforge-unite.com";
export const SITE_ORIGIN = `https://${SITE_HOST}`;
export const PAGES_BASE_PATH = "/";
export const PAGES_DATA_BASE = `${SITE_ORIGIN}/data`;

// Link-preview card (Discord, Telegram, Slack). File lives in public/ and is
// not referenced by the React UI — crawlers read these tags from index.html.
export const OG_IMAGE_FILE = "og-image.jpg";
export const OG_IMAGE_URL = `${SITE_ORIGIN}/${OG_IMAGE_FILE}`;
export const OG_IMAGE_WIDTH = "1024";
export const OG_IMAGE_HEIGHT = "537";

/** Static <meta> tags injected into index.html at build time. */
export function socialMetaTags(): string {
  return [
    `<meta name="description" content="${APP_DESCRIPTION}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${APP_NAME}" />`,
    `<meta property="og:title" content="${APP_NAME}" />`,
    `<meta property="og:description" content="${APP_DESCRIPTION}" />`,
    `<meta property="og:url" content="${SITE_ORIGIN}/" />`,
    `<meta property="og:image" content="${OG_IMAGE_URL}" />`,
    `<meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />`,
    `<meta property="og:image:alt" content="${APP_NAME}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${APP_NAME}" />`,
    `<meta name="twitter:description" content="${APP_DESCRIPTION}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE_URL}" />`,
  ].join("\n    ");
}

// ---------------------------------------------------------------- ownership --
// The person/handle who created + maintains the project. Surfaced in
// Settings → About. Change in one place to re-credit.
export const APP_OWNER = "DreamJackal";

// -------------------------------------------------------------------- legal --
// Fan-project disclaimer shown in the footer (web + desktop). Built from
// APP_NAME so it follows any rename. Pokémon UNITE is published by The Pokémon
// Company (developed by TiMi Studio Group); the Pokémon marks are Nintendo's.
export const LEGAL_DISCLAIMER =
  `${APP_NAME} is an unofficial fan-made tool. It isn't endorsed by, affiliated ` +
  `with, or sponsored by The Pokémon Company or Nintendo, and doesn't reflect ` +
  `the views or opinions of anyone officially involved in producing or managing ` +
  `Pokémon UNITE. Pokémon UNITE and Pokémon are trademarks or registered ` +
  `trademarks of Nintendo.`;

// Footer copyright line. Year is computed at render so it never goes stale.
export const LEGAL_DATA_ATTRIBUTION =
  "Some data from the amazing Unite-DB team · All values verified against official in-game text · Attack-speed model from Mathcord.";

// Footer copyright line. Year is computed at render so it never goes stale.
export const copyrightLine = () => `© ${APP_NAME} ${new Date().getFullYear()}`;
