// Turns a Loadout into everything the UI renders: effective stats, attack
// speed (with active boosts), out-of-combat move speed, active set bonuses, and
// the list of toggleable boosts. One path, reused by StatPanel and CompareView.

import type { Loadout } from "../state/loadout";
import type { CalcContext, EmblemLoadout, Pokemon, StatBlock } from "../types";
import {
  pokemonById,
  heldItemById,
  battleItemById,
  emblemById,
  setBonuses,
  ITEM_GRADE_DEFAULT,
} from "../data/gameData";
import { computeEmblemLoadout } from "./emblems";
import { computeEffectiveStats, outOfCombatMoveSpeed } from "./formulas";
import { computeAttackSpeed, type AttackSpeedResult } from "./attackSpeed";
import {
  availableActiveBoosts,
  activeAttackSpeedPoints,
  activeStatAdds,
  activeStatFactors,
  type ActiveBoost,
} from "./effects";

// Whole-number stats truncate after a multiplicative buff (same rule as the
// emblem set-bonus stacking order).
const INTEGER_STATS = new Set<keyof StatBlock>([
  "hp",
  "attack",
  "defense",
  "spAttack",
  "spDefense",
  "moveSpeed",
]);

export interface DerivedBuild {
  pokemon: Pokemon | null;
  base: StatBlock | null; // base stats at the level (no items/emblems)
  effective: StatBlock | null; // after emblems + held items + active buffs
  emblemLoadout: EmblemLoadout;
  availableBoosts: ActiveBoost[];
  buffedStats: Set<keyof StatBlock>; // stats currently raised by an active toggle
  attackSpeed: AttackSpeedResult | null;
  oocMoveSpeed: number | null;
}

/** Derive the same build at a specific level (for level-scaling graphs). */
export function deriveAtLevel(
  loadout: Loadout,
  level: number,
  inCombat = true,
  slotGrades?: [number, number, number],
): DerivedBuild {
  return deriveBuild({ ...loadout, level }, inCombat, slotGrades);
}

export function deriveBuild(
  loadout: Loadout,
  inCombat = true,
  slotGrades?: [number, number, number],
): DerivedBuild {
  const pokemon = loadout.pokemonId ? (pokemonById.get(loadout.pokemonId) ?? null) : null;
  const heldItems = loadout.heldItemIds.map((id) => (id ? (heldItemById.get(id) ?? null) : null));
  const battleItem = loadout.battleItemId
    ? (battleItemById.get(loadout.battleItemId) ?? null)
    : null;

  const slots = loadout.emblems
    .map((e) => {
      const emblem = emblemById.get(e.emblemId);
      return emblem ? { emblem, grade: e.grade } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const emblemLoadout = computeEmblemLoadout(slots, setBonuses);

  const availableBoosts = availableActiveBoosts(pokemon, heldItems, battleItem);

  if (!pokemon) {
    return {
      pokemon: null,
      base: null,
      effective: null,
      emblemLoadout,
      availableBoosts,
      buffedStats: new Set(),
      attackSpeed: null,
      oocMoveSpeed: null,
    };
  }

  const ctx: CalcContext = { inCombat, goalsScored: 0 };
  const activeIds = new Set(loadout.activeBoostIds);
  const base = pokemon.baseStatsByLevel[loadout.level - 1];
  const equippedHeld = heldItems.filter((i): i is NonNullable<typeof i> => i !== null);
  const grades = slotGrades ?? [ITEM_GRADE_DEFAULT, ITEM_GRADE_DEFAULT, ITEM_GRADE_DEFAULT];
  const equippedGrades = loadout.heldItemIds
    .map((id, i) => (id ? grades[i] : ITEM_GRADE_DEFAULT))
    .filter((_, i) => loadout.heldItemIds[i]);
  const effective = computeEffectiveStats(
    pokemon,
    loadout.level,
    emblemLoadout,
    equippedHeld,
    equippedGrades,
    ctx,
  );

  // Multipliers first (X Attack ×1.2, Inteleon crit ×2), then flat adds
  // (Submission +10 crit points, Barrage Blow +300 Defense) so a double does
  // not also double a flat bonus.
  const factors = activeStatFactors(availableBoosts, activeIds, loadout.level);
  const adds = activeStatAdds(availableBoosts, activeIds, loadout.level);
  const buffedStats = new Set<keyof StatBlock>();
  for (const [stat, factor] of Object.entries(factors) as [keyof StatBlock, number][]) {
    if (factor === 1) continue;
    effective[stat] = INTEGER_STATS.has(stat)
      ? Math.floor(effective[stat] * factor)
      : effective[stat] * factor;
    buffedStats.add(stat);
  }
  for (const [stat, add] of Object.entries(adds) as [keyof StatBlock, number][]) {
    if (add === 0) continue;
    const next = effective[stat] + add;
    effective[stat] = INTEGER_STATS.has(stat) ? Math.floor(next) : next;
    buffedStats.add(stat);
  }

  const activePoints = activeAttackSpeedPoints(availableBoosts, activeIds, loadout.level);
  const attackSpeed = computeAttackSpeed(effective.attackSpeed * 100, [activePoints]);
  // OOC move speed must include yellow's set bonus, which is gated OUT of the
  // in-combat `effective` block above. Re-derive move speed with inCombat:false,
  // then layer on out-of-combat item %s (Float Stone). Active in-combat buffs
  // (e.g. X-Speed) intentionally do NOT apply out of combat.
  const oocEffective = computeEffectiveStats(
    pokemon,
    loadout.level,
    emblemLoadout,
    equippedHeld,
    equippedGrades,
    { inCombat: false, goalsScored: 0 },
  );
  const oocMoveSpeed = outOfCombatMoveSpeed(oocEffective.moveSpeed, equippedHeld, equippedGrades);

  return {
    pokemon,
    base,
    effective,
    emblemLoadout,
    availableBoosts,
    buffedStats,
    attackSpeed,
    oocMoveSpeed,
  };
}
