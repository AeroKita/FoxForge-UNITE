# Theme System — Plan

**Shipped.** Semantic tokens and light/dark theming are live; see AGENTS.md Semantic Theming. The sections below are the original plan, kept as history.

## Why this is its own deliberate pass
The app currently styles with **literal Tailwind color classes** (`bg-white`,
`text-neutral-900`, `border-neutral-200`, accent `indigo`/`amber`/`sky`) spread
across ~14 components. A clean, *maintainable* theme (dark mode and/or a
UNITE-inspired skin) means every surface must read from **semantic tokens**, not
literals — otherwise each future component has to remember `dark:` variants and
the theme rots. That's a focused refactor, deliberately scoped here rather than
rushed, per the maintainability bar.

## Approach: semantic tokens via Tailwind v4 `@theme` + a root class
1. **Define tokens** in `src/index.css`:
   ```css
   @theme {
     --color-bg: #f5f5f5;        /* page */
     --color-surface: #ffffff;   /* cards */
     --color-line: #e5e7eb;      /* borders */
     --color-ink: #171717;       /* primary text */
     --color-muted: #6b7280;     /* secondary text */
     --color-accent: #4f46e5;    /* brand */
   }
   @custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
   [data-theme="dark"] {
     --color-bg: #0b0b12; --color-surface: #15151f; --color-line: #2a2a38;
     --color-ink: #ededf2; --color-muted: #9aa0b0; --color-accent: #8b95ff;
   }
   ```
   Tailwind v4 auto-generates `bg-surface`, `text-ink`, `border-line`, etc.
2. **Migrate components** from literals → tokens:
   `bg-white`→`bg-surface`, `text-neutral-900`→`text-ink`,
   `text-neutral-500`→`text-muted`, `border-neutral-200`→`border-line`,
   `bg-neutral-100`→`bg-bg`. Accent stat colors (emerald/red/amber for +/−,
   role colors) stay literal — they read fine on light and dark.
3. **Toggle**: set `document.documentElement.dataset.theme`; persist in
   localStorage; add a control to the header `Segmented`. Default `light` (or
   `system` via `prefers-color-scheme`).
4. **Themes**: ship `light` + `dark`. A third **UNITE-inspired** skin (or a
   "Neo Street Holowear" neon variant) is then just another token block —
   cheap once tokens exist.

## Estimated scope
~150–250 class swaps across the components + the token block + the toggle.
Mechanical and low-risk *with* visual verification at each step, but large
enough to warrant its own focused session so the result is consistent.

## Recommendation
Do this as a dedicated pass. The current single light theme is cohesive and
already UNITE-adjacent (indigo/violet); shipping a half-migrated dark mode would
look worse than none (the explicit bar the user set).
