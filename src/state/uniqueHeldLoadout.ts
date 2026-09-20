import type { Loadout } from "./loadout";
import { MAX_HELD_ITEMS } from "./loadout";
import { isUniqueHeldItemId, uniqueHeldItemIdForPokemon } from "../data/uniqueHeld";

function padHeldSlots(ids: (string | null)[]): (string | null)[] {
  const held = ids.slice(0, MAX_HELD_ITEMS);
  while (held.length < MAX_HELD_ITEMS) held.push(null);
  return held;
}

function heldSlotsEqual(a: (string | null)[], b: (string | null)[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * Ensure a loadout holds its Pokémon's unique item (and no one else's).
 */
export function affixUniqueHeldItems(loadout: Loadout): Loadout {
  const required = uniqueHeldItemIdForPokemon(loadout.pokemonId);
  const stripped = padHeldSlots(loadout.heldItemIds).map((id) => {
    if (!id) return null;
    if (isUniqueHeldItemId(id) && id !== required) return null;
    return id;
  });

  let nextHeld = stripped;
  if (required) {
    const first = stripped.indexOf(required);
    if (first === -1) {
      nextHeld = [...stripped];
      const empty = nextHeld.findIndex((id) => id == null);
      nextHeld[empty >= 0 ? empty : 0] = required;
    } else {
      nextHeld = stripped.map((id, i) => (id === required && i !== first ? null : id));
    }
  }

  if (heldSlotsEqual(loadout.heldItemIds, nextHeld)) return loadout;
  return { ...loadout, heldItemIds: nextHeld };
}

/** True when this slot currently holds the unique item locked to this Pokémon. */
export function slotHoldsAffixedUnique(loadout: Loadout, slot: number): boolean {
  const required = uniqueHeldItemIdForPokemon(loadout.pokemonId);
  if (!required) return false;
  return loadout.heldItemIds[slot] === required;
}

/**
 * Whether the Held Items picker may write `id` into `slot`.
 * Unique items are never selectable. An affixed unique slot cannot be cleared or replaced.
 */
export function canAssignHeldItem(loadout: Loadout, slot: number, id: string | null): boolean {
  if (slot < 0 || slot >= MAX_HELD_ITEMS) return false;
  if (slotHoldsAffixedUnique(loadout, slot)) return false;
  if (id && isUniqueHeldItemId(id)) return false;
  return true;
}
