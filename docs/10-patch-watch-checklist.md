# Patch Watch & Deferred Data Sources

A lightweight, repeatable process for keeping FoxForge UNITE accurate after a
Pokémon UNITE balance patch — and a record of data sources we have evaluated
but **deliberately deferred**. UNITE-DB stays the primary source; this doc is the
checklist, not a new pipeline.

## Source tiers

| Tier | Source | Status | How it enters the app |
| --- | --- | --- | --- |
| Primary | [UNITE-DB](https://unite-db.com) | **Active** | `tools/community/fetch.py` → `normalize.py` → art via `fetch_art.py` (validated by `validate_art.py`) |
| Primary | Community Attack Speed Calculator (`docs/Attack Speed Calculator.xlsx`) | **Active** | `tools/community/normalize_as_boosts.py` → `src/data/attackSpeedBoosts.json` |
| Authoritative cross-check | In-game screens | **Manual** | Spot-checks during a patch update (no automated ingestion) |
| Deferred | Community forums (Mathcord, Reddit r/PokemonUnite, TPCi discussion threads) | **Deferred — research only** | Not ingested; watched manually (see below) |

## Why forum data is deferred (not dropped)

Forum/Mathcord posts are the best source for mechanics that are never officially
published (true RSB values, hidden cooldown interactions, buff stacking rules).
We are **not** ingesting them yet because:

- **No stable schema.** Posts are prose + spreadsheets in inconsistent formats; a
  scraper would be brittle and need constant babysitting.
- **Trust + churn.** Numbers get corrected in replies days later. Automated
  ingestion risks shipping a wrong value with false confidence.
- **Licensing/attribution.** Community spreadsheets need explicit permission and
  credit before redistribution (we already do this for the AS calculator).

The bar to promote a forum source to ingestion: a maintained, versioned,
machine-readable artifact (a published CSV/JSON or a stable sheet) **plus** an
owner we can credit. Until then it stays a manual watch.

## Per-patch checklist

Run this when a new patch drops (or when UNITE-DB publishes patch changes).

1. **Read the patch notes.** List every changed Pokémon, held item, battle item,
   emblem, and move.
2. **Refresh the primary bundle.**
   - Automated: GitHub → Actions → **Refresh game data** → *Run workflow*
     (`.github/workflows/data.yml`). It re-scrapes, normalizes, mirrors art, and
     commits if anything changed.
   - Local equivalent:
     ```bash
     cd tools/community
     python3 fetch.py
     python3 normalize.py
     python3 normalize_as_boosts.py   # if the AS sheet changed
     python3 fetch_art.py             # mirror new/changed art
     python3 validate_art.py          # fail loudly on broken images
     ```
3. **Bump the bundle version.** Set `patchVersion` via the `PATCH_VERSION` env on
   `normalize.py` (or the `patch_version` input on the **Refresh game data**
   workflow); `lastUpdated` is written automatically by `normalize.py` into
   `src/data/patch-current.json` (see `docs/04-data-sourcing.md`).
4. **Validate.** `npm run typecheck && npm test && npm run build`. The bundle is
   Zod-validated on load and guarded by `src/data/__tests__/patchBundle.test.ts`
   (skill icons present, build moves resolve, etc.).
5. **Spot-check against in-game.** Verify a few high-traffic builds (e.g. Lucario
   Lv15 HP/Atk; one item %; one emblem set threshold) match in-game readouts.
6. **Manual forum watch.** Skim Mathcord / r/PokemonUnite for corrections on any
   mechanic the patch touched (attack-speed buffs, RSB, new move interactions). If
   a value disagrees with UNITE-DB, prefer the in-game readout, then reconcile and
   note the source in the commit message.
7. **Release.** Bump `"version"` in `package.json` if the displayed version should
   change, then push to `main` (Pages redeploys; data publishes via `data.yml`).

## Data-integrity guards already in place

- `validate_art.py` rejects HTML/error payloads saved as images (the v0.1.6
  broken-emblem fix) and runs in CI.
- `normalize.py` filters build `upgrade`/move fields against each Pokémon's real
  move catalog, dropping malformed entries.
- Gold-only emblems are flagged (`goldOnly`) so non-existent Bronze/Silver grades
  never render.
- Tests assert AS boosts are numeric and that every non-basic move has a local
  skill icon.

## Scheduled refresh

[`data.yml`](../.github/workflows/data.yml) already runs on a daily cron (`0 9 * * *`, 09:00 UTC) and on `workflow_dispatch`. It opens a review PR; it does not push directly to `main`.
