# Contributing to FoxForge UNITE

Thanks for helping forge better UNITE loadouts! This is a step-by-step guide to getting set up, making a change, and opening a pull request that passes review on the first try.

FoxForge UNITE is a non-commercial fan project under [AGPL-3.0-only](LICENSE). By contributing, you agree your work is licensed the same way.

The authoritative description of *how the project works* lives in [`AGENTS.md`](AGENTS.md). Deeper dives live in [`docs/`](docs/).

## Prerequisites

Set these up once before your first contribution.

1. **Install Node.js 24+.** The exact major is pinned in [`.node-version`](.node-version) and matched by CI; anything older may pass locally and fail in CI.
2. **Have `git` and a GitHub account.** Contributions land through pull requests against [`AeroKita/FoxForge-UNITE`](https://github.com/AeroKita/FoxForge-UNITE).
3. **(Game-data work only) Install Python 3.** You only need it if you intend to refresh game data via `tools/community/`. App and engine changes do not require Python. Run `npm run data:doctor` first to confirm your environment; for step-by-step content updates (new Pokémon, items, builds, or clips), follow [`docs/11-adding-content.md`](docs/11-adding-content.md).
4. **Clone and install.** This also installs the Husky pre-commit hook (via the `prepare` script), which auto-formats your staged TypeScript on commit.

```bash
git clone https://github.com/AeroKita/FoxForge-UNITE.git
cd FoxForge-UNITE
npm install
```

5. **Confirm the toolchain is healthy** before you change anything, so you know a later failure is yours:

```bash
npm run dev      # open the printed URL
npm run test:tools && npm run verify   # the full CI gate — should pass on a clean checkout
```

## Contributing

Follow these steps for each change. If there's a relevant issue, reference it (`#123`) in your PR — but a well-described PR on its own is welcome too. The mechanics below are all you need.

1. **Create a focused branch** off `main`. Keep one logical change per branch and per PR.

```bash
git switch -c feat/short-description
```

2. **Read the architecture authority before you touch code.** The links at the top of this guide define the engine-first boundary and the single derivation path; violating them is the most common way a PR gets bounced. Don't restate those rules here — read them at the source so you're working against the current truth.
3. **Write the test first.** This repo follows test-driven development: add or update the failing test that captures the behavior, watch it fail, then write the code that makes it pass. Engine and pure-logic changes belong in `src/**/*.test.ts` (Vitest); Python data tooling has `python3 -m unittest` tests under `tools/community/`.
4. **Implement the change** against the running dev server (`npm run dev`).
5. **Format and lint as you go.** The pre-commit hook formats staged files, but you can run it manually:

```bash
npm run lint:fix
npm run format
```

6. **Run the full gate locally** and fix everything it reports. CI runs Python tool tests first, then the Node verify script. `npm run verify` stays Node-only (lint → format:check → typecheck → test → validate → verifyPatch → validate:art) so it can run in environments without Python deps. The local full gate matching CI is:

```bash
npm run test:tools && npm run verify
```

7. **Commit with a conventional-commit message** (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`). Reference an issue (`#123`) if one applies. Keep all files for one logical change in a single commit where practical.

```bash
git commit -m "feat: add float stone OOC move-speed tier (#123)"
```

8. **Push and open a pull request** against `main` with a clear description of the change and its motivation. Update the PR description if behavior changes during review.

## Checklist

Before you open a PR, confirm every box. CI runs the same gate and will block the PR otherwise.

- [ ] `npm run test:tools && npm run verify` passes locally (Python pipeline tests, then lint → format:check → typecheck → test → validate → verifyPatch → validate:art).
- [ ] New or changed behavior is covered by a test that you wrote *before* the implementation.
- [ ] No game math or stat formatting was reimplemented in a component — it routes through the engine and `src/ui/format.ts`.
- [ ] No React/DOM imports leaked into `src/engine/`.
- [ ] No generated bundle JSON (`src/data/`, `public/data/`) or curated label was hand-edited; data changes go through `tools/community/` scripts. User-facing prose/typo fixes go through `SPELLING_FIXES` or `patch_note_overrides.json` in normalize, not the bundle.
- [ ] Commits use conventional-commit prefixes (and reference a relevant issue, `#<n>`, if one applies).
- [ ] Architecture-affecting changes are reflected in `AGENTS.md` and/or `docs/`.
- [ ] The branch is focused on a single logical change and is up to date with `main`.
