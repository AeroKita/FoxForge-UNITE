# FoxForge UNITE

**Forge your UNITE Loadout!** A build optimizer for Pokémon UNITE that helps
players design optimized builds — recommending Emblem loadouts and Held Items
tailored to a selected Pokémon, with real-time stat calculation and
level-scaling visualization.

## Install & Run

Two ways to use the tool — pick whichever suits you.

### 1. Use it in your browser (no install)

Open the hosted web app: **<https://aerokita.github.io/FoxForge-UNITE/>**

It's an installable web app ("Add to Home Screen" / "Install"). Game data is bundled with the build and also fetched from Pages at launch. The hosted Pages deploy disables the service worker on purpose (`selfDestroying` in `vite.config.ts`) so an old cache cannot blank the app. Local `npm run dev` / `npm run build` can still register a service worker.

### 2. Run from source

Requires **[Node.js](https://nodejs.org) 24+** (matches CI). Version is pinned in [`.nvmrc`](.nvmrc) — use [NVM](https://github.com/nvm-sh/nvm). Clone, install, and start the dev server:

```bash
git clone https://github.com/AeroKita/FoxForge-UNITE.git
cd FoxForge-UNITE
nvm install && nvm use   # reads .nvmrc
npm install
npm run dev        # open the printed URL (default http://localhost:5173)
```

### Cutting a new release

The hosted app redeploys automatically: every push to `main` triggers
[`pages.yml`](.github/workflows/pages.yml), which builds `dist/` and publishes it to
GitHub Pages. There is no separate release step — bump `"version"` in `package.json`
when you want the displayed version to change, then push.

## Data & attribution

Game stats are sourced from [UNITE-DB](https://unite-db.com); Basic move/Ability tooltip text is owned in-game copy in `tools/community/move_descriptions.json` (see [In-game Basic text](docs/13-in-game-basic-text.md)). Pokémon UNITE and all related data © Nintendo / The Pokémon Company / TiMi Studio Group. This is a non-commercial fan project.

Licensed under [AGPL-3.0-only](LICENSE).

## Documentation

- [Project Brief](docs/01-project-brief.md) — what we're building and why
- [Architecture](docs/02-architecture.md) — tech stack and structure
- [Calculation Engine](docs/03-Calculation-Engine.md) — the stat/damage math
- [Data Sourcing](docs/04-data-sourcing.md) — where game data comes from and how to update it
- [Adding Content](docs/11-adding-content.md) — human runbook for adding a Pokémon, item, build, or clip (no AI required)
- [Adding Move Clips](docs/12-adding-move-clips.md) — drop recordings → one command → commit
- [Implementation Plan](docs/05-implementation-plan.md) — milestones and datamining pipeline
- [Theme Plan](docs/06-theme-plan.md) — semantic tokens and the light/dark theming approach
- [Distribution & Updates](docs/07-distribution.md) — Pages web app, PWA install, game-data auto-update
- [Branding](docs/08-branding.md) — how to rename the app + regenerate icons
- [Data Sourcing Research](docs/09-data-sourcing-research.md) — upstream source landscape (UNITE-DB vs uniteapi, APK pipeline)
- [In-game Basic text](docs/13-in-game-basic-text.md) — where Basic tooltip copy comes from, and how to apply in-game sentences

## Layout

**Engine (pure, tested)**
- [`src/types.ts`](src/types.ts) — core data model
- [`src/engine/formulas.ts`](src/engine/formulas.ts) — stat stacking, mitigation, RSB damage, eHP
- [`src/engine/emblems.ts`](src/engine/emblems.ts) — emblem loadout aggregation (flats + set bonuses)
- [`src/engine/attackSpeed.ts`](src/engine/attackSpeed.ts) — AS-points → frame-breakpoint → attacks/sec
- [`src/engine/effects.ts`](src/engine/effects.ts) — toggleable active boosts (X-Atk, RFS proc, moves)
- [`src/engine/derive.ts`](src/engine/derive.ts) — Loadout → effective stats + attack speed (one path)

**Data (versioned, update-able)**
- [`src/data/patch-current.json`](src/data/patch-current.json) — full game bundle (100 Pokémon,
  41 held items, 10 battle items, 258 emblems), community-sourced from UNITE-DB
- [`src/data/attackSpeedBoosts.json`](src/data/attackSpeedBoosts.json) — AS boost catalog
  (10 global items + 61 per-Pokémon move buffs with level gating)
- [`src/data/loadBundle.ts`](src/data/loadBundle.ts) — zod-validated bundle loading
- `public/assets/` — mirrored art (497 images: portraits, thumbnails, item & emblem icons)

**App (React)**
- [`src/state/`](src/state) — `loadout.ts` (model + localStorage, 20-loadout cap), `heldItemGrades.ts` (global per-item grades), `store.tsx` (reducer/context)
- [`src/components/`](src/components) — `BuildScreen`, `LoadoutBoard`, `EmblemOptimizer`, `StatPanel`, `CompareView`, `HeldItemsInventory`, `PickerModal`, `CollapsibleCard`

**Tooling**
- `tools/community/` — UNITE-DB scraper + normalizers (`fetch.py`, `normalize.py`, `fetch_art.py`,
  `normalize_as_boosts.py` — dissects `docs/Attack Speed Calculator.xlsx`)
- `tools/extract/` — first-party APK pipeline (**blocked**: rotated bundle encryption,
  see [ENCRYPTION-FINDINGS.md](tools/extract/ENCRYPTION-FINDINGS.md))

## Commands

```bash
npm run dev                     # vite dev server — the app
npm run build                   # production static site → dist/ (portable: base "./")
npm run build:pages             # static build with the GitHub Pages base path
npm run preview                 # serve the built dist/ locally
npm test                        # engine + bundle + attack-speed + state + UI suites (vitest)
npm run validate                # known-values gate from docs/03-Calculation-Engine.md
npx tsx src/data/verifyPatch.ts # validate the live UNITE-DB bundle end-to-end
npm run typecheck               # tsc --noEmit
```

## Deploying

`npm run build` emits a self-contained static site in `dist/` (≈258 KB gzipped JS + the
art). Because `vite.config.ts` sets `base: "./"` and images resolve through
[`src/ui/asset.ts`](src/ui/asset.ts), the same build works at a domain root, a sub-path
(GitHub Pages project site), or via `npm run preview` — just drop `dist/` on any static host.

## Updating game data

Everything numeric lives in versioned JSON, refreshed by scripts (never hand-edited):

```bash
cd tools/community && source ../extract/.venv/bin/activate
python3 fetch.py                # re-scrape UNITE-DB (pokemon/items/emblems/stats)
python3 normalize.py            # → src/data/patch-current.json (zod-validated)
python3 fetch_art.py            # refresh public/assets/ icons & portraits
python3 normalize_as_boosts.py  # → src/data/attackSpeedBoosts.json from the xlsx
```

To add an active combat effect (e.g. a new item's in-combat buff), extend the catalog
in `attackSpeedBoosts.json` or the resolver in `src/engine/effects.ts` — the UI toggles
and recompute pick it up automatically.

## Status

The live product surface, theming, and data pipeline are documented in [`AGENTS.md`](AGENTS.md). Basic vs Advanced mode, collapsible cards, shareable `#b=` links, and GitHub Pages deploys live there — this README does not keep a second milestone graveyard.

### Deliberately not built
- **Nintendo / Pokémon UNITE account login** to read owned emblems — there is no official public OAuth for third parties; the only route would be handling the user's Nintendo credentials, a security/ToS line not worth crossing. The local owned-emblem inventory delivers the same UX safely.

### Open refinements
- Per-move attack-speed level availability is best-effort. Hosted Pages uses a self-destroying service worker on purpose; do not re-enable it to chase offline caching.
