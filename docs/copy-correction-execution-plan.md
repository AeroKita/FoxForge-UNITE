# Execution plan: user-facing copy correction + regression gates

**Historical.** The copy pipeline landed. Do not re-execute this plan. New typos go through `SPELLING_FIXES` / `replaceText` per [`docs/11-adding-content.md`](11-adding-content.md).

**For:** a follow-up Grok 4.6 agent implementing this plan.  
**Overseer:** the agent that produced `docs/copy-audit-report.md`.  
**Inventory:** that report is the finding list. Do not rediscover from scratch. Do not expand into UI label unification or UNITE-DB house style.

---

## Goal

1. Correct the audited Basic/Advanced move, passive, held-item, and battle-item typos **through the data pipeline** so daily UNITE-DB refreshes cannot wipe them.
2. Add **structural CI gates** so placeholders, known misspellings, glued sentences, and `Pokemon`/escape leftovers fail `npm test` / `npm run verify` before they ship again.
3. Leave a **short runbook** in existing docs (not a new parallel system) so the next typo has one obvious home.

Success is: regenerated bundles no longer contain the audited errors, CI fails if they return, and future agents know where to put a new fix.

---

## Non-negotiable rules

1. **Never hand-edit** `src/data/patch-current.json` or `public/data/patch-*.json` as the source of a prose fix. Those files are normalize output. The next `data.yml` refresh will overwrite orphaned edits.
2. **Never edit** `tools/community/_raw/` (re-downloaded).
3. **Do not** rewrite UNITE-DB house style: `themself`, semicolon-as-comma Advanced clauses, leading decimals (`.75s`), official `Has the user…`, or every “dealing X and decreases” parallelism. Those are voice, not this PR. Adding dozens of style overrides is clutter and they expire badly.
4. **Obsolete (do not follow).** Archive bodies in `move_descriptions.json` **do** override UNITE-DB Basic whenever they have a real body. New Basic typos are fixed in that archive plus a banned fragment in `patchBundle.test.ts`. See [`docs/11-adding-content.md`](11-adding-content.md) and [`docs/13-in-game-basic-text.md`](13-in-game-basic-text.md).
5. **Do not** change `src/engine/`, optimizer math, or emblem arrays.
6. **Do not** add a full English spellchecker or hunspell in CI. Game terms create noise; we gate **known-bad fragments + structural junk** only.
7. Prefer **one durable mechanism** over a pile of one-off exceptions:
   - Global safe typo → `SPELLING_FIXES` (plain `str.replace`, case-sensitive).
   - Sentence-specific / unsafe globally → `patch_note_overrides.json` `replaceText` with a `find` guard.
   - “This class of junk must never ship” → CI in `patchBundle.test.ts` (and Python tests for the helper).
8. `SPELLING_FIXES` is **not word-bounded**. Reject any key that is a substring of a correct word (e.g. do not add `dela` — it could hit unrelated strings). Use `replaceText` for those.
9. If `{0}` has **no number in Advanced or in-game text**, do **not invent one**. Rewrite the sentence without a numeral, or skip and record it in the PR. Wrong numbers are worse than ugly braces.
10. Branch: `cursor/copy-pipeline-gates-9c2f` from latest `main` (`git fetch origin main` first). Commits: one logical change each (see Commit plan). PR draft until verify is green, then mark ready.

---

## Architecture (why this survives the next refresh)

```
UNITE-DB _raw/  →  normalize.py
                      ├─ assemble descriptions
                      ├─ fix_spelling_deep(SPELLING_FIXES)   // global, forever, no-op when upstream is clean
                      └─ apply_patch_note_overrides()       // guarded; prints + skips when UNITE-DB already fixed
                 →  patch-current.json
                 →  publish_bundle.py → public/data/patch-<ver>.json
CI: patchBundle.test.ts banned fragments + new structural gates
Daily data.yml: fetch → normalize → publish  (fixes re-apply automatically)
```

When UNITE-DB ships a corrected sentence, the override `find` misses, normalize prints `! patch-note override expired`, and the next refresh PR should **prune that entry**. That is intended, not a failure.

---

## Implementation order (TDD)

### 0. Setup

```bash
git fetch origin main
git checkout main
git pull origin main
git checkout -b cursor/copy-pipeline-gates-9c2f
```

Read before editing:

- `tools/community/normalize.py` — `SPELLING_FIXES`, `fix_spelling`, `apply_patch_note_overrides`, `_override_find_held_item`
- `tools/community/patch_note_overrides.json`
- `tools/community/test_normalize.py` — `TestFixSpelling`, `TestApplyPatchNoteOverrides`
- `src/data/__tests__/patchBundle.test.ts` — existing banned-fragment test
- `docs/copy-audit-report.md` — inventory

### 1. Tests first (this is the future-proofing)

**A. Expand `TestFixSpelling.test_known_misspellings`** in `tools/community/test_normalize.py` with one assert per new `SPELLING_FIXES` pair (same style as existing lines 214–229). Also keep slug passthrough tests (`250-ho-oh` must stay ASCII).

**B. Expand the banned list** in `src/data/__tests__/patchBundle.test.ts` (`does not ship known UNITE-DB prose misspellings`). Add every new `SPELLING_FIXES` key **and** every `replaceText` `find` string. Existing keys stay.

**C. Add structural gates in the same test file** (new `it(...)` blocks, scan the same description fields plus held + battle item descriptions):

| Gate | Fail if any user-facing description contains | Why |
|---|---|---|
| Placeholders | `{0}` `{1}` `{2}` | Falinks/Meowth/Inteleon class |
| Templates | `use(s)` or `time(s)` | leftover UNITE-DB templates |
| Literal escapes | `\u201c` or `\u201d` as four-char sequences in the **parsed** string | Mew Coaching |
| ASCII mark | `\bPokemon\b` (capital P, no accent) | execute-cap notes |
| Truncated mark | `Pokmon` or `Pokémn` | Empoleon / Typhlosion / Mega Lucario |
| Duplicate words | `the the `, ` in in `, `within in ` | Mewtwo Y / Glaceon / Darkrai |
| Known glues | `times.If`, `hits.When`, `hits.The`, `move.When`, `direction.The`, `time.If`, `attacks.When`, `ally.Afterward`, `hits.At`, `hits Once`, `time. .`, `gauge When`, `effect After` | missing space/period |
| Garbled uniques | `itsm ovement`, `uanble`, `munable`, `Compute and Crash`, `Meowsacarda`, `Solagaleo`, `increases.<` | not safe to forget |

Do **not** add a generic `/[a-z]\.[A-Z]/` regex — it false-positives on `Sp.Atk` / `Lv.`.

**D. Battle-item override lookup test** (Python): today `_override_find_held_item` only walks `heldItems`. Goal Hacker and Fluffy Tail are **battle** items. Extend lookup (see step 3) and add a `TestApplyPatchNoteOverrides` case that `replaceText`s a battle item by `item` id (or a new `battleItem` key — pick one and use it consistently).

Run `npm run test:tools` and `npx vitest run src/data/__tests__/patchBundle.test.ts` — they **should fail** until steps 2–4 land. That is the point.

### 2. `SPELLING_FIXES` (global, safe)

Add to `SPELLING_FIXES` in `normalize.py` (keep the comment block; keys case-sensitive). **Exact pairs:**

```
uanble → unable
othr → other          # "other" does not contain "othr"; safe
guage → gauge
gauage → gauge
disatance → distance
oppsing → opposing
blasing → blasting
Blass → Blasts        # Mega Charizard Y Fire Blast Basic
rapdily → rapidly
psychich → psychic
forawrd → forward
dirrection → direction
whiile → while
bcomes → becomes
efffect → effect
recoves → recovers
unabled → unable
illusary → illusory
targetted → targeted
preceeding → preceding
inititally → initially
Meowsacarda → Meowscarada
Solagaleo → Solgaleo
Pokmon → Pokémon
Pokémn → Pokémon
Pokemon → Pokémon     # ASCII; slugs are lowercase "pokemon" and will not match
Hinderances → Hindrances
continus → continues
bounceds → bounces
illusionary → illusory
SpAtk → Sp. Atk       # Fluffy Tail + Typhlosion Blaze; no correct "SpAtk" should remain
```

**Do not put in SPELLING_FIXES:** `dela` (substring risk), `hit's` (OK actually — always wrong — you MAY add `hit's` → `hits`), `the users ` (add only as `the users ` → `the user's ` if you verify no legitimate plural “the users ”), `munable` (garbled “them unable” — replaceText), `itsm ovement` (replaceText), `comet s` (replaceText), `use(s)` (see `{0}` rules), `agai ` (replaceText — `again` contains no `agai ` with space but `agai` alone could be risky; use `used agai ` → `used again `).

Allowed extra globals after a repo-wide search proves uniqueness:

- `hit's` → `hits`
- `it'self` → `itself`
- `it's movement` → `its movement`
- `it's basic` → `its basic`
- `oor hits` → `or hits`
- `lungest` → `lunges`

### 3. Extend overrides to battle items

In `normalize.py`, make item overrides resolve `heldItems` **or** `battleItems` (same `item` key is finest — one function, two lists). Update the docstring. No new override `kind`.

### 4. `replaceText` entries (sentence-specific)

Append to `tools/community/patch_note_overrides.json` `overrides` array. Each entry: `kind`, `pokemon`+`move` **or** `item`, `fields`, `find` (exact current substring), `replace`, `why`. `find` must be the **pre-fix** text (guard).

Use `docs/copy-audit-report.md` as the checklist. Minimum set (do not skip these):

**Placeholders / templates**

| Target | find → replace |
|---|---|
| meowth / pay-day / description | `A maximum of {0} use(s)` → `A maximum of 2 uses` (Advanced: “2 uses can be kept in reserve”) |
| inteleon / liquidation / description | `hits {0} times` → `hits 8 times` only if you confirm Advanced’s “8 projectiles” is the same threshold; **if unsure, skip and say so in the PR** |
| falinks / beat-up / description | Advanced does **not** state the reserve count. **Do not invent.** Prefer `A maximum of {0} use(s) can be kept in reserve for this move.` → `Uses can be kept in reserve for this move.` |
| ceruledge / flame-charge / description | `2 use(s)` → `2 uses` |
| miraidon / charge-beam, electro-drift / description | `2 use(s)` → `2 uses` |
| miraidon / parabolic-charge / description | `1 stored use(s)` → `1 stored use` |
| tyranitar / stone-edge / description | `3 time(s)` → `3 times` |

**Garbled / unique sentences** (quote `find` from the live bundle, not from memory):

- dhelmise / heavy-slam: `leaving the munable to act` → `leaving them unable to act`
- dhelmise / bulldoze: `its anchor dealing` → `its anchor, dealing`
- darkrai / shadow-claw: `used agai and` → `used again and`
- mega-lucario / power-up-punch: `itsm ovement speed` → `its movement speed`
- mega-lucario / aura-cannon: `opposing Pokmon` is covered by SPELLING_FIXES; still add `area of effect After using` → `area of effect. After using`
- metagross / gyro-ball: `oor hits` if not global; `spin rapdily` is SPELLING_FIXES
- metagross / compute-and-crush: `lungest`; `gauge When 3` → `gauge. When 3`; Advanced `Compute and Crash` → `Compute and Crush`
- mew / coaching: `\\u201ccoached\\u201d` as it exists in the **parsed** string → `"coached"` (verify the actual characters before writing `find`); `coached on allies` → `coached allies`
- meowscarada / trailblaze: `increases.< If` → `increases. If`
- meowscarada / night-slash Advanced: `The users throws` → `The user throws`
- latios / draco-meteor: `comet s` → `comets`; `the move comets are summoned` → `the more comets are summoned`
- feraligatr / big-jaw-bite: `designated panel from the opposing team` → `designated Pokémon from the opposing team`
- dodrio / peck Advanced: `jab the in the` → `jab in the`
- dragapult / dragon-breath: `damage over tim` → `damage over time`; `the uesr` is SPELLING_FIXES if you add `uesr`→`user` (search first: `uesr` is unique — OK in SPELLING_FIXES); `and the decreasing their` → `and decreasing their`
- articuno / ice-wing-whiteout description is upgrade-only. Do **not** invent a full Unite Move Basic. Either copy Advanced’s first paragraph into Basic via replaceText of the whole current Basic, or leave it and note “content gap, not a typo.” Prefer **leave + note** unless Advanced first paragraph is clearly the missing Basic.
- psyduck / disable: sentence ends `While the mysterious power is active.` — do not invent the missing clause; note in PR.
- zacian / metal-claw: starts `as the user release` → `Has the user release`
- blastoise / water-spout Advanced: `damaging opposing over time` → `damaging opposing Pokémon over time`
- pawmot / volt-switch: `once only Fighter Mode;` → `once only. Fighter Mode:`
- pawmot / thunder-punch: `Pokémon it hit.` → `Pokémon it hits.`
- sableye / chaos-glower: `an cone` → `a cone`
- tsareena / stomp: `attacks enemies their feet` → `attacks enemies with their feet`
- mega-charizard-y / seismic-slam: `for aa set time` → `for a set time`
- aegislash / attack: `boosted boosted` → `boosted`
- glaceon / freeze-dry: `time. . This` → `time. This`
- mewtwoy / future-sight: `the the amount` → `the amount`
- glaceon / glacial-stage Advanced: `in in the` → `in the`
- darkrai / dark-void Advanced: `within in the` → `within the`; `to marked enemy` → `to the marked enemy`; `the Enemy falls` → `the enemy falls`
- scizor / red-illusion-dive Advanced: `them an slowing` → `them and slowing`
- espeon / psychic-solare: `After a dela,` → `After a delay,`
- alcremie / attack Advanced: `whip cream` → `whipped cream`
- ceruledge / bitter-blade Advanced: `HP equals to` → `HP equal to`
- garchomp / livid-outrage Advanced: `Every attack more damage` → `Every attack deals more damage`
- zoroark / attack Advanced: `a boosted with every` → `a boosted attack with every`
- zapdos already covered by `preceeding` SPELLING_FIXES
- mega-charizard-x / fire-punch Basic is **wrong move text** (Flamethrower). Do **not** freely rewrite. `replaceText` the opening only if you can lift the correct Basic from Advanced in one guarded swap; otherwise note as a content bug and skip.

**Glued periods** — one `replaceText` per move, `find` the exact glue:

`times.If` `hits.When` `hits.The` `move.When` `direction.The` `time.If` `attacks.When` `ally.Afterward` `hits.At` plus suicune icy-wind `hits Once` → `hits. Once`

**Held / battle items**

| item id | find → replace |
|---|---|
| assault-vest | `its not fully` → `it's not fully` |
| amulet-coin | `16s cd` → `16s CD` |
| big-root | `self healing` → `self-healing` |
| choice-scarf | `non movement, non auto attack` → `non-movement, non-auto-attack` |
| charizardite-x, charizardite-y, gyaradosite, lucarionite | `One of the variety` → `One of a variety` |
| goal-hacker (battle) | `zone overrides the` → `zone override the` |
| fluffy-tail (battle) | `SpAtk` handled by SPELLING_FIXES |

**Apostrophe clusters (Tyranitar Basic)** — prefer globals `hit's` / `the users ` / `it'self` / `it's movement` / `it's basic` if searches show they only appear as errors. Sand Tomb still needs `while the user in the cloud` → `while the user is in the cloud`.

**cd → CD** for leftover lowercase `(5s cd)` `(4s cd)` `(16s cd)` `(50s cd)`: global `(s cd)` is unsafe. Per-string replaceText or a small normalize helper that only rewrites `\d+s cd)` → `\d+s CD)`. A tiny helper is better than 15 overrides — keep it in `normalize.py` next to `fix_spelling`, unit-test it, apply inside `fix_spelling` or immediately after. Do **not** create a second spelling system.

Walk the rest of the audit report. For each remaining row: if a SPELLING_FIXES key already fixes it, skip; if not, add `replaceText` **or** skip as style/voice and say so in the PR. Do not silently drop clear misspellings.

### 5. Regenerate bundles (required)

```bash
npm run data:refresh -- --mode curate
```

That runs normalize → presets → publish → verify (Node). Description-only changes should **not** rewrite `emblemOptimizerPresets.json`. If that file diffs, stop and investigate — you touched the wrong layer.

Confirm:

- `src/data/patch-current.json` and `public/data/patch-<version>.json` stay byte-identical (`publishedSync.test.ts`).
- Spot-check Dhelmise Anchor Shot / Heavy Slam / Seaweed Snare, Dragonite Draco Impact, Mega Lucario Power-Up Punch, Mew Coaching, Meowth Pay Day, Assault Vest.

### 6. Lasting runbook (small, no new bureaucracy)

Edit existing docs only:

**[AGENTS.md](AGENTS.md)** — in the `SPELLING_FIXES` / `patch_note_overrides` paragraph, add 4 bullets:

- New **word-level** UNITE-DB typo → `SPELLING_FIXES` + `TestFixSpelling` + banned fragment.
- New **sentence-level** typo → `replaceText` in `patch_note_overrides.json` + banned `find`.
- Never hand-edit patch JSON for prose.
- Structural junk (`{0}`, `use(s)`, literal `\u201c`, ASCII `Pokemon`) is gated in `patchBundle.test.ts`; if you invent a new junk class, add a gate there, not a one-off comment.

**[docs/11-adding-content.md](docs/11-adding-content.md)** — one short subsection “Fixing user-facing typos” pointing at those two files. Do not create `docs/13-…`.

**[CONTRIBUTING.md](CONTRIBUTING.md)** — one line in the data/checklist area: prose fixes go through normalize, not the bundle.

Do **not** duplicate the full audit table into AGENTS.md.

### 7. Out of scope (explicit)

- UI chrome consistency (`Sp.Atk` vs `Sp. Atk`, Fast vs Quick, My emblems vs Owned only). Separate PR if ever wanted.
- Articuno Ice Wing Whiteout missing Basic body (content gap).
- Psyduck Disable cut-off sentence (don’t invent).
- Mega Charizard X Fire Punch wrong-move Basic (unless a single guarded swap from Advanced is obvious).
- `{0}` on Falinks if you cannot find a number — de-numeralize, don’t guess.
- Inteleon `{0}` if 8 projectiles ≠ “hits N times” — skip and report.
- Theme/copy in React components.
- `generate:presets` churn.

---

## Commit plan

1. `test(data): add structural copy gates and spelling-fix cases` — tests only; expected red.
2. `fix(data): expand SPELLING_FIXES and patch-note prose overrides` — normalize.py, overrides, battle-item lookup, helper tests.
3. `chore(data): regenerate patch bundles after copy pipeline` — `patch-current.json`, `public/data/*` only (no preset file unless proven necessary).
4. `docs: record copy-fix routing for UNITE-DB prose` — AGENTS.md, docs/11, CONTRIBUTING.md.

Push `cursor/copy-pipeline-gates-9c2f`. Open a **draft** PR into `main` with title:

`fix(data): correct UNITE-DB tooltip typos and gate them in CI`

PR body: motivation (users see UNITE-DB typos; refresh was overwriting ad-hoc edits), what layer each class of fix uses, Screenshots **N/A** (data/tooling), How I tested (`npm run test:tools && npm run verify`, plus the spot-checks), note any skipped inventory rows.

Mark ready only after verify is green.

---

## Verify

```bash
npm run test:tools
npm run verify
```

Minimum spot-checks (read the regenerated JSON, do not trust the override file alone):

1. Dhelmise Anchor Shot Basic has `unable`, Heavy Slam `them unable`, Seaweed Snare `other`.
2. Dragonite Draco Impact Basic has `gauge` and `distance`.
3. Mega Lucario Power-Up Punch Basic has `its movement`.
4. Mew Coaching Basic shows `"coached"` (or curly quotes), not `\u201c`.
5. Meowth Pay Day Basic has `2 uses`, no `{0}`.
6. Assault Vest has `it's not`.
7. No `Pokemon` (ASCII) in any description.
8. `publishedSync` still passes.

No browser/UI walkthrough required (tooling + bundle). If you open the app anyway, tooltip-check those six Pokémon/items.

---

## If something fights you

| Symptom | What to do |
|---|---|
| `SPELLING_FIXES` changes an id or asset path | You used a key that matches a slug. Revert that key; use `replaceText`. `*Asset` is already skipped. |
| Override expired immediately | Your `find` does not match the **post-`fix_spelling_deep`** string. Overrides run after spelling. Re-copy `find` from a normalize dry-run. |
| `presetsSync` / huge preset diff | You regenerated more than descriptions. Stop. Do not commit presets. |
| `{0}` number unknown | De-numeralize or skip. Never guess. |
| Tempted to edit patch JSON “just this once” | Don’t. The next `data.yml` run will revert it and look like a regression. |
| Unsure if a line is voice vs typo | Skip and list it under “left as UNITE voice” in the PR. |

---

## Done when

- [ ] Inventory rows that are real typos are fixed **or** explicitly skipped with a reason
- [ ] Bundles regenerated via curate refresh, published copies identical
- [ ] New CI gates fail if someone reintroduces `{0}`, `use(s)`, `uanble`, ASCII `Pokemon`, etc.
- [ ] AGENTS.md / docs/11 / CONTRIBUTING say where the next typo goes
- [ ] `npm run test:tools && npm run verify` green
- [ ] PR opened on `cursor/copy-pipeline-gates-9c2f`
