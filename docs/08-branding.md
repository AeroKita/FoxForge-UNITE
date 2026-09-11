# Branding: renaming the app & changing the icon

The app's name, tagline, and icon are intentionally easy to change. This is the
full, exact process.

## Rename the app

### 1. One source of truth (covers the whole web app)

Edit [`src/ui/brand.ts`](../src/ui/brand.ts):

```ts
export const APP_NAME = "FoxForge UNITE";        // header title, HTML <title>, PWA name
export const APP_SHORT_NAME = "FoxForge";        // PWA home-screen label
export const APP_TAGLINE = "Forge your UNITE Loadout!"; // reserved; not shown in the app header
export const APP_DESCRIPTION = "…";              // PWA + meta description
export const GITHUB_REPO_SLUG = "FoxForge-UNITE"; // GitHub repo name
export const SITE_HOST = "foxforge-unite.com";    // custom domain, public/CNAME
export const PAGES_BASE_PATH = "/";               // VITE_BASE for build:pages
```

That single file drives:
- the in-app name in Settings → About ([`src/components/SettingsMenu.tsx`](../src/components/SettingsMenu.tsx)); the Build/Optimize app bar shows the selected Pokémon, not `APP_TAGLINE` (`APP_TAGLINE` is unused in the UI today)
- the browser tab title (`index.html` `__APP_NAME__` placeholder, replaced by the
  `htmlBranding` plugin in [`vite.config.ts`](../vite.config.ts)),
- the PWA manifest `name` / `short_name` / `description`,
- exported loadout `app` labels ([`src/state/loadout.ts`](../src/state/loadout.ts)),
- the default remote data URL ([`src/data/dataSource.ts`](../src/data/dataSource.ts)),
- Discord/Telegram/Slack link-preview tags (`socialMetaTags()` → `og:*` / `twitter:*` in `index.html`). The card image is [`public/og-image.jpg`](../public/og-image.jpg) and is not shown in the app UI.

If you change `SITE_HOST` or `PAGES_BASE_PATH`, also update `package.json` (`build:pages` `VITE_BASE`), `public/CNAME`, and `tools/community/publish_bundle.py` (`BASE_URL`). Those files cannot import TypeScript. `GITHUB_REPO_SLUG` is only the GitHub repo name.

### 2. Do NOT change

- The `package.json` `"name"` (`unite-build-optimizer`) — an internal identifier, not
  user-facing. Changing it isn't necessary for a rename and risks confusing tooling.

### 3. Ship it

- Push to `main` → Pages redeploys with the new name.

## Change the icon

The committed source is [`tools/app-icon.png`](../tools/app-icon.png) — a 1024×1024
master image. To swap in new art, point the generator at any image (it's
normalized to 1024² RGBA and written back to `tools/app-icon.png`), then regenerate
the web icons:

```bash
# Adopt a new master + regenerate web/PWA icons (favicon, apple-touch, pwa-192/512)
node tools/make-icons.mjs path/to/new-icon.png
```

(Run `node tools/make-icons.mjs` with no argument to regenerate the web icons from
the existing source.) Commit the regenerated `tools/app-icon.png` and `public/*`.
The web icons deploy on the next push to `main`.
