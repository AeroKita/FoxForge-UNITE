# Distribution & Updates

The tool ships **one way: a hosted installable web app** on GitHub Pages, with **two update channels** — the app code and the game data update independently.

## Distribution

**Hosted web app** (zero install): GitHub Pages deploys `dist/` on every push to `main` ([`.github/workflows/pages.yml`](../.github/workflows/pages.yml)) at **https://foxforge-unite.com/**. It is installable from the browser ("Add to Home Screen" / "Install"). Game data is bundled in the build and also fetched from the same origin. The Pages deploy sets Vite PWA `selfDestroying` so a leftover service worker cannot serve a blank stale cache. Local non-Pages builds may still register a service worker. The `github.io` project URL redirects to the custom domain once DNS is live.

## Two update channels

1. **App updates** (UI/engine code) — a new Pages deploy is picked up on the next reload. No manual step, no separate release.
2. **Game-data updates** (stats every patch) — the app fetches `data/manifest.json` from Pages at launch; if `version` (the bundle's `lastUpdated`) changed, it downloads + zod-validates + caches the new bundle, applied next launch ([`dataSource.ts`](../src/data/dataSource.ts)). The bundled JSON is the offline fallback. **A patch update = publish one JSON — no app rebuild.** [`data.yml`](../.github/workflows/data.yml) re-scrapes daily at 09:00 UTC and opens a review PR.

## One-time setup (in GitHub repo settings)

1. **Pages**: Settings → Pages → Source = GitHub Actions.
2. **Custom domain**: Settings → Pages → Custom domain = `foxforge-unite.com`, then Enforce HTTPS. The same hostname lives in `public/CNAME` so the Actions artifact keeps it.
3. **DNS** at the registrar (apex A records to GitHub Pages; optional `www` CNAME to `aerokita.github.io`). See [GitHub's custom-domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
4. If the public host or repo/owner ever changes, update `SITE_HOST` / `SITE_ORIGIN` in `src/ui/brand.ts`, `VITE_BASE` in `package.json` (`build:pages`), `public/CNAME`, and `BASE_URL` in `tools/community/publish_bundle.py`. You can still override the fetch URL at build time with `VITE_DATA_BASE_URL`.

## Notes

- **Size**: the build is ≈258 KB gzipped JS plus ~22 MB of art, bundled for offline use —
  flip `asset()` to a remote base later if you want a lighter initial load.
