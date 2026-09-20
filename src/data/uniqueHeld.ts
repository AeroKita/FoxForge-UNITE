import type { HeldItem, Pokemon } from "../types";
import { heldItems, isUniqueHeldItem, pokemonList } from "./gameData";

/**
 * Unique held-item ids derived from a held-item list (empty `statsByGrade`).
 */
export function uniqueHeldItemIdsFrom(items: readonly HeldItem[]): Set<string> {
  return new Set(items.filter(isUniqueHeldItem).map((item) => item.id));
}

function heldIdsFromPokemon(pokemon: Pokemon): string[] {
  const ids: string[] = [];
  for (const build of [...(pokemon.builds ?? []), ...(pokemon.creativeBuilds ?? [])]) {
    ids.push(...build.heldItemIds);
  }
  return ids;
}

/**
 * Unique item id → Pokémon id, from builds that list that item.
 * First owner wins when more than one Pokémon lists the same unique item.
 */
export function uniqueHeldOwnerByItemIdFrom(
  pokemon: readonly Pokemon[],
  uniqueIds: ReadonlySet<string>,
): Map<string, string> {
  const owners = new Map<string, string>();
  for (const mon of pokemon) {
    for (const itemId of heldIdsFromPokemon(mon)) {
      if (uniqueIds.has(itemId) && !owners.has(itemId)) owners.set(itemId, mon.id);
    }
  }
  return owners;
}

export const UNIQUE_HELD_ITEM_IDS: ReadonlySet<string> = uniqueHeldItemIdsFrom(heldItems);

export const UNIQUE_HELD_OWNER_BY_ITEM_ID: ReadonlyMap<string, string> =
  uniqueHeldOwnerByItemIdFrom(pokemonList, UNIQUE_HELD_ITEM_IDS);

export function isUniqueHeldItemId(id: string): boolean {
  return UNIQUE_HELD_ITEM_IDS.has(id);
}

export function pokemonIdForUniqueHeldItem(itemId: string): string | null {
  return UNIQUE_HELD_OWNER_BY_ITEM_ID.get(itemId) ?? null;
}

export function uniqueHeldItemIdForPokemon(pokemonId: string | null): string | null {
  if (!pokemonId) return null;
  for (const [itemId, ownerId] of UNIQUE_HELD_OWNER_BY_ITEM_ID) {
    if (ownerId === pokemonId) return itemId;
  }
  return null;
}
