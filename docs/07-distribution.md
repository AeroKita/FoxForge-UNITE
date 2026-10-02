# Distribution & Updates

The tool ships **one way: a hosted installable web app** on GitHub Pages. App code and game data both reach the live site when a release is deployed.

## Distribution

**Hosted web app** (zero install): GitHub Pages deploys `dist/` when a release is created ([`.github/workflows/release-please.yml`](../.github/workflows/release-please.yml) calls [`.github/workflows/pages.yml`](../.github/workflows/pages.yml)) at **https://foxforge-unite.com/**. A push to `main` does not deploy. It is installable from the browser ("Add to Home Screen" / "Install"). Game data is bundled in the build and also fetched from the same origin. The Pages deploy sets Vite PWA `selfDestroying` so a leftover service worker cannot serve a blank stale cache. Local non-Pages builds may still register a service worker. The `github.io` project URL redirects to the custom domain once DNS is live.

## What publishes a release

Release Please opens a release pull request when `main` has a version bump since the last release. Squash-merge that pull request. The merge creates the GitHub release and runs the Pages deploy ([`.github/workflows/release-please.yml`](../.github/workflows/release-please.yml)). Job `deploy` is skipped on the push that only opens the pull request. Job `deploy / deploy` publishes https://foxforge-unite.com/.

| Commit | Release |
| --- | --- |
| `feat` | minor |
| `fix` | patch |
| breaking change (`type!:` or a `BREAKING CHANGE` footer) | major |

`chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, and `revert` are listed in [`release-please-config.json`](../release-please-config.json) so they appear in the changelog of a release. They do not open one. A data refresh is committed as `chore(data): refresh UNITE data`. It stays on `main` until a later release that contains a version bump is merged.

After the work is on `main`, a maintainer can run `/shipit`. The skill is [`.cursor/skills/shipit/SKILL.md`](../.cursor/skills/shipit/SKILL.md).

## Two update channels

1. **App updates** (UI/engine code) — merging the release pull request creates a release, Pages deploys, and the next reload picks it up.
2. **Game-data updates** (stats every patch) — the app fetches `data/manifest.json` from Pages at launch; if `version` (the bundle's `lastUpdated`) changed, it downloads + zod-validates + caches the new bundle in IndexedDB (`src/data/dataCacheStore.ts`), applied next launch ([`dataSource.ts`](../src/data/dataSource.ts)). `src/main.tsx` hydrates that cache before importing the app so `activeRaw()` can read it synchronously. Trainer data (current loadout, saved builds, owned emblems, grades) stays in `localStorage`; a leftover `unite-build-optimizer.dataCache.v1` localStorage key is migrated then deleted so the patch JSON cannot exhaust iPhone quota. A Home Screen icon is a full document load (Pages has no live service worker). Safari and the Home Screen icon do not share storage. The bundled JSON is the offline fallback. A data-refresh merge stays on `main` until the release pull request that includes it is merged and deployed. [`data.yml`](../.github/workflows/data.yml) re-scrapes daily at 09:00 UTC and opens a review PR.

## One-time setup (in GitHub repo settings)

1. **Pages**: Settings → Pages → Source = GitHub Actions.
2. **Custom domain**: Settings → Pages → Custom domain = `foxforge-unite.com`, then Enforce HTTPS. The same hostname lives in `public/CNAME` so the Actions artifact keeps it.
3. **DNS** at the registrar (apex A records to GitHub Pages; optional `www` CNAME to `aerokita.github.io`). See [GitHub's custom-domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
4. If the public host or repo/owner ever changes, update `SITE_HOST` / `SITE_ORIGIN` in `src/ui/brand.ts`, `VITE_BASE` in `package.json` (`build:pages`), `public/CNAME`, and `BASE_URL` in `tools/community/publish_bundle.py`. You can still override the fetch URL at build time with `VITE_DATA_BASE_URL`.

## Notes

- **Sharing** is hash-only (`#p=` / `#e=` / `#o=` and legacy `#b=`). Nothing in a share link leaves the device.
- **Size**: the build is ≈258 KB gzipped JS plus ~22 MB of art, bundled for offline use —
  flip `asset()` to a remote base later if you want a lighter initial load.
