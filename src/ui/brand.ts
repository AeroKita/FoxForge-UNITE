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
  "FoxForge UNITE — design optimized Pokémon UNITE loadouts: emblems, held & trainer items, attack speed, and live stats.";

// GitHub repo slug + hosted Pages URLs. Display name stays "FoxForge UNITE";
// the hyphenated slug is for paths, remotes, and VITE_BASE.
export const GITHUB_REPO_SLUG = "FoxForge-UNITE";
export const GITHUB_REPO = `AeroKita/${GITHUB_REPO_SLUG}`;
export const PAGES_BASE_PATH = `/${GITHUB_REPO_SLUG}/`;
export const PAGES_DATA_BASE = `https://aerokita.github.io/${GITHUB_REPO_SLUG}/data`;

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
