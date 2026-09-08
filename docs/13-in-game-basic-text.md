# In-game Basic text — accuracy, sources, and next work

How FoxForge UNITE gets **Basic** move and Ability tooltip copy, why UNITE-DB is not enough, and how to make the next pass more accurate. Numbers, cooldowns, and **Advanced** text still come from UNITE-DB. This file is about the Basic sentences players read in Basic mode.

Companion rule for agents: `.cursor/rules/in-game-basic-accuracy.mdc`. Runbook commands: [`11-adding-content.md`](11-adding-content.md). Research on APK / APIs: [`09-data-sourcing-research.md`](09-data-sourcing-research.md). Remaining roster list: `plans/2026-09-07-basic-description-followups.md` (workspace `plans/`, outside this git repo).

## What is true

- **Authoritative Basic text is the English tooltip in Pokémon UNITE** (Switch or mobile), not a fan site.
- The owned archive is `tools/community/move_descriptions.json`. `normalize.py` fills Basic when UNITE-DB's body is blank or upgrade-only.
- **Advanced** is assembled from UNITE-DB `rsb.true_desc` (and staged Ability descriptions). Do not overwrite Advanced with Basic.
- UNITE-DB often stores the **pre-evolution** Ability as `skills[].name` and the playable one as `passive2_name` / `passive3_name`. The app shows the pre-evo name until that Pokémon's slug is on `PLAYABLE_PASSIVE_SLUGS`.
- **Mega licenses** are a second path: Pre-Mega + Mega rows via `mega_license_passive_names` / `extraPassives`. Do not put `mega-charizard-x` (and similar) on `PLAYABLE_PASSIVE_SLUGS` — that path *replaces* one Ability.
- **Mew `passive2_name` is Move Reset**, a UI control, not the playable Ability. Keep **Synchronize**.

## What does not work (do not retry without an explicit new decision)

| Idea | Why it is not the live path |
| --- | --- |
| Official Nintendo/TiMi API | None exists. |
| `uniteapi.dev` | Match analytics (win/pick), not move constants or tooltip copy. |
| Launch UNITE on this Mac and have an agent click through Practice | This session cannot drive a Switch or a UNITE client. Even with computer-use later, ToS, login, and OCR of a 3D UI are a poor spelling source. |
| APK / UnityFS / `global-metadata.dat` decrypt | Keys rotated after UntieUnite 2021. Project already failed this (`tools/extract/ENCRYPTION-FINDINGS.md`). Do not reverse `libil2cpp.so` or dump client files. |
| Copy Serebii / Bulbapedia / Unite-DB wiki prose as Basic | Retired as a live source. Useful only as a temporary stand-in, then replace with in-game text. |
| Full `npm run data:harvest` after a small description pass | Rewrites hundreds of unrelated archive lines. Use **curate** only. |

## How to apply a batch of in-game Basics (current recipe)

1. Operator pastes in-game Basic (or drops tooltip stills under `tools/community/_descs/<pokemon-id>/`).
2. Transcribe into `move_descriptions.json` (normalized keys; `\n\n` between paragraphs; straight apostrophes).
3. If the Ability name in the app is still the pre-evo name, add the UNITE-DB `name` slug to `PLAYABLE_PASSIVE_SLUGS` in `tools/community/normalize.py`.
4. Remove `patch_note_overrides.json` rows whose `move` id was the old Ability (normalize raises on unknown ids). Example: Tsareena **Oblivious** override after promoting **Queenly Majesty**.
5. Tests first: `test_normalize.py` for promotion; `patchBundle.test.ts` for name + a distinctive Basic phrase (and a `not.toContain` for the leftover pre-evo word).
6. `npm run data:refresh -- --mode curate --patch-version 1.24.1.3 --no-verify`
7. `python3 tools/community/fetch_art.py` (curate does not download new Ability icons).
8. `npm run test:tools && npm run verify`

Promotion **clears** UNITE-DB Basic so the archive can fill it. Staged UNITE-DB Advanced (often numeric) still ships as `descriptionAdvanced` when present. Empty staged Advanced (Ceruledge Weak Armor, Raichu Surge Surfer, most mega extras) omits Advanced; the UI falls back to Basic.

## Strengthening accuracy (plans, in order)

1. **Tooltip stills, not websites.** Same capture habit as move clips: Practice → Ability/move tooltip → PNG. Agent can read PNG/JPEG with the Read tool and check spelling against the archive. Video is not required.
2. **Finish `plans/2026-09-07-basic-description-followups.md` section 1 leftovers.** Mega **Pre-Mega** Abilities (Solar Power, Blaze, Justified, Intimidate) still have stand-in Basic until the operator supplies in-game text. Section 2 (Basic identical to Advanced) and section 3 (numbers leaking into Basic) are still open.
3. **Do not promote the whole roster blindly.** Each slug is a product choice. Counterexample: Mew Move Reset.
4. **Keep harvest off the description-only path.** If a full refresh is required, review harvest diffs so unofficial UNITE-DB Basic does not overwrite good archive text.
5. **Optional later:** a `data:gaps` check that flags Basic identical to Advanced, or Basic that still names a pre-evolution (Eevee, Larvitar, Honedge, …). Do not add change-detector tests that lock the full sentence.

## Applied 2026-09-08 (operator-supplied Basic)

Playable Ability + Basic (not Advanced): Aegislash Stance Change; Ceruledge Weak Armor; Dragonite Multiscale; Espeon Magic Bounce; Glaceon Snow Cloak; Gyarados Moxie; Leafeon Chlorophyll; Raichu Surge Surfer; Tsareena Queenly Majesty; Tyranitar Sand Stream; Umbreon Inner Focus; Urshifu Unseen Fist; Vaporeon Water Absorb.

Mega-stage Basic only (Pre-Mega rows unchanged): Mega Charizard X Tough Claws; Mega Charizard Y Drought; Mega Lucario Adaptability; Mega Gyarados Mold Breaker.
