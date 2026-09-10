# Implementation Plan: Pokémon UNITE Build Optimizer

*Historical milestone plan; the bundle filename is now the stable `src/data/patch-current.json` (see [docs/04-data-sourcing.md](04-data-sourcing.md)). APK encryption later blocked first-party extraction; UNITE-DB is the live data path.*

> Saved planning artifact (not yet executed). Engine-first build, with first-party
> datamining of the game APK as the primary data source.

## Context

The user wants a tool that helps Pokémon UNITE players design optimized loadouts
(Emblem sets + Held Items) for a chosen Pokémon, with live stat calculation and
level-scaling (Lv 1–15) visualization. A thorough planning repo already exists
(brief, architecture, calc-engine spec, data-sourcing guide, a TypeScript schema,
pure formula functions, and one sample Lucario bundle). A 897 MB Japanese game APK
(v1.23.1.1) in `../UNITE APK Data/` is the intended **first-party** data source.

### Decisions locked (from the user)
- **Data source: datamine the APK directly** to obtain first-party source data
  (stats, items, emblems, art). Community DBs (Unite-DB / UniteAPI) are a
  **last-resort fallback only**, used per-value and flagged when used. Build whatever
  tooling is needed; downloading required libraries/tools is authorized.
- **First milestone:** the calculation **engine + tests**, before any UI.
- **Stack:** React **web** app (Vite + React + TypeScript + Tailwind + Recharts).

### Feasibility finding (from a read-only probe of the APK)
The `.apkm` is a split-APK zip: `base.apk` (Unity/IL2CPP engine + `assets/bin/Data`),
`split_ab.apk` (817 MB, the data as `assets/Main/*.bundle`), and per-arch
`split_config.*` APKs (native `libil2cpp.so`).
- Sampled bundles all begin with magic **`UnityFS`**, engine **Unity 2019.4.15f1** —
  **standard, unencrypted Unity AssetBundles**. No custom container/encryption wrapper.
  → UnityPy / AssetStudio can read them directly.
- **Open question resolved during M2 (not now):** whether master tables are TextAssets
  (easy) or IL2CPP MonoBehaviours with stripped field names (needs an il2cpp type dump).
  The pipeline below branches on this.

### Chosen defaults (sensible; not requiring a decision)
npm; Vitest; zod for runtime validation; **Python + UnityPy** for extraction in a
separate `tools/` dir (never shipped in the web bundle); Il2CppDumper + AssetRipper as
needed/cross-check.

---

## What already exists and will be reused (do not rewrite)
- `schema/types.ts` — full data model (StatBlock, Pokemon, Move/RSB, HeldItem, Emblem,
  EmblemSetBonus, EmblemLoadout, GameDataBundle, CalcContext). **Normalization target
  for extracted data.**
- `schema/formulas.ts` — `rawDamage`, `physical/specialDamageTaken`,
  `damageTakenWithReduction`, `effectiveHp`, `roundEmblemTotals`, `computeEffectiveStats`,
  `setBonusStat`. **Documented stacking order is ground truth.**
- `data/example-lucario.json` — validation seed + engine test fixture while the full
  bundle is being extracted.
- `docs/03-Calculation-Engine.md` / `docs/04-data-sourcing.md` — authoritative specs.

---

## Milestone 1 — Calculation engine + tests (engine-first deliverable)
Independent of the APK; uses the Lucario sample as fixture. Runs via `npm test` + `npm run validate`.

1. **Scaffold** Vite + React + TS in this repo (keep docs). Deps: react, recharts, zod;
   dev: vitest, tailwind, tsx. Folders per `docs/02-architecture.md` (`src/engine`,
   `src/data`, `src/components` stub, `src/types.ts`). Relocate `schema/types.ts →
   src/types.ts`, `schema/formulas.ts → src/engine/formulas.ts`.
2. **Fill the engine gap** — add `src/engine/emblems.ts` with
   `computeEmblemLoadout(slots, setBonuses): EmblemLoadout`. The schema declares
   `activeSetBonuses` / `flatTotals` "computed at runtime" but **nothing computes them**.
   - flatTotals = sum per-grade emblem stats (Platinum = Gold values).
   - activeSetBonuses = count emblems per color (2-color emblem counts both; duplicate
     Pokémon counts once) → highest threshold met per color (2/4/6 vs 3/5/7 colors).
3. **Data loading + zod validation** — `src/data/loadBundle.ts` validates against a zod
   schema mirroring `GameDataBundle`; fails loudly on malformed data.
4. **Vitest suite** asserting the documented targets:
   - Lucario Lv15 base = HP 7249 / Atk 429 / Def 390 / SpAtk 115 / SpDef 300 / Crit .20 /
     AtkSpd .40 / MoveSpd 4300.
   - **6 Brown** multiplies `(baseAtk + emblemFlatAtk)`, **then** Float Stone +28 flat Attack
     adds *after* (guards the project's stated #1 inaccuracy).
   - `roundEmblemTotals`: 18.6→19, 18.4→18 (standard rounding on summed totals).
   - Emblem thresholds; Attack Weight stacking via `context.goalsScored`; OOC flag via
     `appliesInCombat:false`.
5. **`npm run validate`** known-values gate (`tsx src/engine/validate.ts`) — PASS/FAIL before UI.

*Correctness notes to verify against in-game behavior (flag, don't silently change):* stat
caps (atk-speed/crit/move-speed) not modeled; yellow/pink kept at display layer; confirm no
held item grants a % (vs flat) that would break step-4 ordering.

---

## Milestone 2 — First-party datamining pipeline (primary data effort)
A standalone Python toolkit in `tools/extract/` that turns the APK into (a) image assets and
(b) a versioned `patch-1.23.1.1.json` bundle conforming to `types.ts`. Run independently of M1
(can start in parallel). Each step is its own script so we can inspect output and branch.

1. **`requirements.txt` + setup** — `UnityPy`, `Pillow`, decompressors (`lz4`, `brotli`);
   download Il2CppDumper and AssetRipper (GitHub releases) into `tools/vendor/` for the
   IL2CPP branch / cross-check.
2. **`01_unpack.py`** — read the `.apkm`, extract `split_ab.apk` → `assets/Main/*.bundle` and
   `base.apk` → `assets/bin/Data/*` into `tools/extract/_work/` (one-time local unpack).
3. **`02_scan.py`** — load every bundle with UnityPy; report object-type counts (Texture2D,
   Sprite, TextAsset, MonoBehaviour, …) and **whether type trees are present**
   (`obj.serialized_type.nodes`). **This output decides the numeric branch.** Dump a sample of
   TextAsset names and MonoBehaviour `m_Name`s (look for *pokemon/item/emblem/param/table/config*).
4. **`03_extract_art.py`** (high confidence) — export all Texture2D/Sprite → PNG named by
   `m_Name` into `src/assets/{pokemon,items,emblems,ui}/`; emit an id→file manifest JSON.
5. **Numeric extraction — branch on `02_scan.py`:**
   - **(a) TextAsset tables** → dump bytes; detect format (JSON / CSV / MessagePack / Protobuf /
     encrypted); decode and parse.
   - **(b) MonoBehaviours WITH type trees** → UnityPy reads fields by name directly.
   - **(c) MonoBehaviours, type trees STRIPPED (IL2CPP)** → run `Il2CppDumper` on
     `libil2cpp.so` (from `split_config.arm64_v8a.apk`) + `global-metadata.dat` (from
     `base.apk` `assets/bin/Data/Managed/Metadata/`) to recover class/field defs, generate
     type trees so UnityPy/AssetRipper can deserialize MonoBehaviours with names.
6. **`04_normalize.py`** — map recovered raw tables → `types.ts` shapes (per-level
   `baseStatsByLevel`, `heldItems.statsByGrade` + effects, `emblems.statsByGrade`,
   `setBonuses`, move RSB) and write `src/data/patch-1.23.1.1.json` with `patchVersion` /
   `lastUpdated`. Tag any field that fell back to a community source with a `source` note.
7. **`05_verify.py`** — cross-check recovered numbers against the engine's known targets
   (e.g. Lucario Lv15 base) and run the bundle through zod (`loadBundle`). Mismatches block.

*Fallback policy:* community DBs are consulted only for a specific value that extraction can't
recover, and every such value is flagged in-data. *Note:* this is personal/educational
reverse-engineering of a game the user owns; proceeding.

---

## Later milestones (sequence only; refine after M1/M2)
- **M3 — Core UI.** PokemonPicker → EmblemLoadout + HeldItemSelector → live StatPanel
  (`computeStats` on every change), using extracted art + bundle.
- **M4 — Visualization.** Level slider + Recharts LevelGraph across Lv 1–15 (breakpoints/spikes).
- **M5 — Recommendation engine.** `src/engine/recommend.ts`: rule-based from attackType,
  set-bonus thresholds, item/emblem synergies; refine later.

---

## Verification
**M1 (engine):** `npm install && npm test` green; `npm run validate` PASS for every documented
target; `npx tsc --noEmit` clean; load `example-lucario.json` via `loadBundle` (zod passes;
corrupt a value → fails loudly).
**M2 (datamining):** `02_scan.py` reports the container/type-tree situation; `03_extract_art.py`
produces recognizable PNGs (spot-check a Pokémon portrait + an item icon); `04_normalize.py`
emits `patch-1.23.1.1.json`; `05_verify.py` shows extracted Lucario Lv15 base matching the
engine targets and the bundle passing zod — with zero (or explicitly flagged) community fallbacks.
