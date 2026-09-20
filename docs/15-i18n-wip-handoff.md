# Unfinished language WIP vs unique held items

This file is the handoff for finishing internationalization **after** unique held items land.

Do not merge unfinished language work with unique-held work. The two tracks live on separate branches so a unique-held review can ship English UI copy without the incomplete `src/i18n/` conversion.

## Branches

| Branch | Role |
| --- | --- |
| `feat/unique-held-items` | Shippable unique held-item affix/lock/picker. English strings in components. No `src/i18n/`. |
| `wip/i18n` | **Local only.** Unfinished language conversion, plus an older mixed copy of unique-held that used `t()`. Do **not** push or merge this branch until i18n is finished and rebased. |

`origin/main` stays the English production line until a unique-held PR merges.

## What unique held items already do

Keep this behavior. Do not re-implement it during the language rebase.

- Owners come 1:1 from Recommended/Creative builds (`src/data/uniqueHeld.ts`). First owner wins.
- `affixUniqueHeldItems` in `src/state/uniqueHeldLoadout.ts` bakes the Pokémon's unique item on and strips everyone else's. The store reducer, hydration, and Compare resolution all run it. `src/state/loadout.ts` stays frozen.
- The Held Items picker cannot select unique items. Unique rows are grayed, `aria-disabled`, grouped under **Unique Items**, and still wrap `Tooltip` for long-press.
- On the Builds Items card, the owner's unique slot is a locked non-button tile (lock badge). It cannot be swapped or cleared.

Live English copy on `feat/unique-held-items`:

- Items hint: `Tap a slot to swap items — unique items stay equipped. Tap an item's name to set its grade.`
- Locked slot aria: `{name} (unique, locked)`
- Picker group title: `Unique Items`
- Picker hint: `Cannot be selected — unique items stay on the Pokémon they belong to.`

## When the language update is ready

1. Confirm `feat/unique-held-items` is on `origin/main` (or rebase onto that unique-held commit if it is not merged yet).
2. Update local `main` from `origin/main`.
3. Rebase the local language branch onto that unique-held tip:

```bash
git checkout wip/i18n
git rebase feat/unique-held-items
# or, after unique-held merges:
git rebase origin/main
```

4. Resolve conflicts by **keeping unique-held behavior** and **wrapping the English strings in `t()`**. Do not drop `uniqueHeld.ts`, `uniqueHeldLoadout.ts`, `heldPicker.ts`, the reducer wrap, Compare affix, locked `SlotTile`, or picker `groupInfo`.
5. Add catalog keys (English already exists on `wip/i18n`; copy them into `es` / `ja` if still missing):

   - `loadout.itemsHint`
   - `loadout.uniqueHeldAria` (`{name} (unique, locked)`)
   - `items.uniqueTitle`
   - `picker.uniqueUnavailable`

6. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run format:check` before any language PR.
7. Do not ship `wip/i18n` until catalogs, `documentLang`, and Settings language UI are complete.

## Likely conflict files

`src/components/LoadoutBoard.tsx`, `src/components/PickerModal.tsx`, `src/state/store.tsx`, `src/state/compareBuilds.ts`, `AGENTS.md`, and (on the language branch) `src/i18n/catalogs/*.ts`.

If unique-held landed with literals and the language branch still has an older `t()` unique-held mix, take the unique-held side for logic, then re-apply `t()` only on the strings listed above.

## Do not

- Push `wip/i18n` “to back it up” onto GitHub while it still mixes unfinished i18n with unique-held.
- Re-derive unique-item owners from display names or Mega Charizard dual-stone guesses. Builds are the source of truth.
- Put unique-held affix logic into frozen `src/state/loadout.ts`.
