import type { Pokemon, PokemonBuild } from "../types";
import type { Loadout, SavedLoadout } from "./loadout";
import { emptyLoadout, toLoadout } from "./loadout";
import { moveIdsFromNames } from "../engine/moves";
import { pokemonById } from "../data/gameData";
import { affixUniqueHeldItems } from "./uniqueHeldLoadout";

export type CompareSource = "recommended" | "creative" | "current" | "saved";
export type PresetSource = "recommended" | "creative";

/** One side's full selection state. `variant` indexes presetBuilds(); `savedId`
 *  is only meaningful when source === "saved". */
export interface SideSelection {
  source: CompareSource;
  pokemonId: string | null;
  variant: number;
  savedId: string | null;
}

/** Complete (exactly-10-emblem) curated builds for a Pokémon under a preset
 *  source. Mirrors RecommendPanel's `b.emblems.length === 10` completeness filter. */
export function presetBuilds(pokemon: Pokemon | null, source: PresetSource): PokemonBuild[] {
  if (!pokemon) return [];
  const list = source === "recommended" ? pokemon.builds : pokemon.creativeBuilds;
  return (list ?? []).filter((b) => b.emblems.length === 10);
}

/** True when the Pokémon has at least one complete Creative build. */
export function hasCreative(pokemon: Pokemon | null): boolean {
  return presetBuilds(pokemon, "creative").length > 0;
}

/** A curated build → a standalone level-15 Loadout (no active boosts), suitable
 *  for deriveBuild(). Independent of the store's current loadout. */
export function presetToLoadout(pokemon: Pokemon, build: PokemonBuild): Loadout {
  const { move1Id, move2Id } = moveIdsFromNames(pokemon, build.moves);
  return affixUniqueHeldItems({
    ...emptyLoadout(pokemon.id),
    heldItemIds: [
      build.heldItemIds[0] ?? null,
      build.heldItemIds[1] ?? null,
      build.heldItemIds[2] ?? null,
    ],
    battleItemId: build.battleItemId ?? null,
    move1Id,
    move2Id,
    emblems: build.emblems.map((e) => ({ emblemId: e.emblemId, grade: e.grade })),
  });
}

/** Resolve a side's selection into the concrete Loadout to derive + display.
 *  Fallbacks: a "saved" id that no longer exists, or a preset side with no
 *  resolvable build, fall back to `current` / an empty loadout so the UI never
 *  crashes. */
export function selectionToLoadout(
  sel: SideSelection,
  current: Loadout,
  saved: SavedLoadout[],
): Loadout {
  if (sel.source === "current") return current;
  if (sel.source === "saved") {
    const s = saved.find((x) => x.id === sel.savedId);
    return s ? affixUniqueHeldItems(toLoadout(s)) : current;
  }
  const pokemon = sel.pokemonId ? (pokemonById.get(sel.pokemonId) ?? null) : null;
  const builds = presetBuilds(pokemon, sel.source);
  if (!pokemon || builds.length === 0) return affixUniqueHeldItems(emptyLoadout(sel.pokemonId));
  const i = Math.min(Math.max(sel.variant, 0), builds.length - 1);
  return presetToLoadout(pokemon, builds[i]);
}
