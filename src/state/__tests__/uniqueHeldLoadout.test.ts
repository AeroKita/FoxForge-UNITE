import { describe, expect, it } from "vitest";
import { emptyLoadout } from "../loadout";
import { reducer } from "../store";
import {
  affixUniqueHeldItems,
  canAssignHeldItem,
  slotHoldsAffixedUnique,
} from "../uniqueHeldLoadout";

function loadout(
  pokemonId: string | null,
  heldItemIds: [string | null, string | null, string | null],
) {
  return { ...emptyLoadout(pokemonId), heldItemIds };
}

describe("affixUniqueHeldItems", () => {
  it("bakes the unique item onto an empty loadout for its Pokémon", () => {
    const next = affixUniqueHeldItems(emptyLoadout("mega-lucario"));
    expect(next.heldItemIds).toEqual(["lucarionite", null, null]);
  });

  it("strips unique items from Pokémon they do not belong to", () => {
    const next = affixUniqueHeldItems(
      loadout("pikachu", ["lucarionite", "muscle-band", "rusted-sword"]),
    );
    expect(next.heldItemIds).toEqual([null, "muscle-band", null]);
  });

  it("keeps an already-equipped unique item in its current slot", () => {
    const start = loadout("zacian", ["muscle-band", null, "rusted-sword"]);
    expect(affixUniqueHeldItems(start).heldItemIds).toEqual(["muscle-band", null, "rusted-sword"]);
  });

  it("fills the first empty slot when the unique item is missing", () => {
    const next = affixUniqueHeldItems(
      loadout("mega-lucario", ["attack-weight", null, "weakness-policy"]),
    );
    expect(next.heldItemIds).toEqual(["attack-weight", "lucarionite", "weakness-policy"]);
  });

  it("replaces slot 0 when the unique item is missing and all slots are filled", () => {
    const next = affixUniqueHeldItems(
      loadout("mega-lucario", ["attack-weight", "muscle-band", "weakness-policy"]),
    );
    expect(next.heldItemIds).toEqual(["lucarionite", "muscle-band", "weakness-policy"]);
  });

  it("swaps unique items when the Pokémon changes", () => {
    const next = affixUniqueHeldItems(
      loadout("zacian", ["lucarionite", "muscle-band", "rapid-fire-scarf"]),
    );
    expect(next.heldItemIds).toEqual(["rusted-sword", "muscle-band", "rapid-fire-scarf"]);
  });

  it("drops extra copies of the affixed unique item", () => {
    const next = affixUniqueHeldItems(
      loadout("mewtwox", ["mewtwonite-x", "muscle-band", "mewtwonite-x"]),
    );
    expect(next.heldItemIds).toEqual(["mewtwonite-x", "muscle-band", null]);
  });

  it("returns the same object when held items are already valid", () => {
    const start = loadout("mega-gyarados", ["gyaradosite", "attack-weight", null]);
    expect(affixUniqueHeldItems(start)).toBe(start);
  });
});

describe("slotHoldsAffixedUnique / canAssignHeldItem", () => {
  const lucario = loadout("mega-lucario", ["lucarionite", "attack-weight", null]);

  it("locks the slot that holds the Pokémon's unique item", () => {
    expect(slotHoldsAffixedUnique(lucario, 0)).toBe(true);
    expect(slotHoldsAffixedUnique(lucario, 1)).toBe(false);
    expect(slotHoldsAffixedUnique(lucario, 2)).toBe(false);
  });

  it("rejects clearing or replacing a locked unique slot", () => {
    expect(canAssignHeldItem(lucario, 0, null)).toBe(false);
    expect(canAssignHeldItem(lucario, 0, "muscle-band")).toBe(false);
  });

  it("rejects selecting any unique item in the picker", () => {
    expect(canAssignHeldItem(lucario, 2, "lucarionite")).toBe(false);
    expect(canAssignHeldItem(lucario, 2, "rusted-sword")).toBe(false);
    expect(canAssignHeldItem(emptyLoadout("pikachu"), 0, "gyaradosite")).toBe(false);
  });

  it("allows normal held-item edits on unlocked slots", () => {
    expect(canAssignHeldItem(lucario, 1, "muscle-band")).toBe(true);
    expect(canAssignHeldItem(lucario, 1, null)).toBe(true);
    expect(canAssignHeldItem(lucario, 2, "scope-lens")).toBe(true);
  });
});

describe("reducer unique held items", () => {
  it("affixes the unique item when switching to its Pokémon", () => {
    const next = reducer(emptyLoadout("pikachu"), {
      type: "setPokemon",
      pokemonId: "mega-lucario",
    });
    expect(next.pokemonId).toBe("mega-lucario");
    expect(next.heldItemIds).toContain("lucarionite");
  });

  it("strips unique items when switching to a Pokémon they do not belong to", () => {
    const start = loadout("mega-lucario", ["lucarionite", "muscle-band", null]);
    const next = reducer(start, { type: "setPokemon", pokemonId: "pikachu" });
    expect(next.heldItemIds).toEqual([null, "muscle-band", null]);
  });

  it("ignores picker attempts to equip a unique item", () => {
    const start = emptyLoadout("pikachu");
    const next = reducer(start, { type: "setHeldItem", slot: 0, id: "rusted-sword" });
    expect(next.heldItemIds).toEqual([null, null, null]);
  });

  it("ignores picker attempts to clear or replace a locked unique slot", () => {
    const start = loadout("zacian", ["rusted-sword", "muscle-band", null]);
    expect(reducer(start, { type: "setHeldItem", slot: 0, id: null }).heldItemIds).toEqual(
      start.heldItemIds,
    );
    expect(reducer(start, { type: "setHeldItem", slot: 0, id: "scope-lens" }).heldItemIds).toEqual(
      start.heldItemIds,
    );
  });

  it("still lets unlocked slots change on a unique-item Pokémon", () => {
    const start = loadout("zacian", ["rusted-sword", null, null]);
    const next = reducer(start, { type: "setHeldItem", slot: 1, id: "muscle-band" });
    expect(next.heldItemIds).toEqual(["rusted-sword", "muscle-band", null]);
  });

  it("re-affixes the unique item when applyBuild omits it", () => {
    const start = loadout("mega-lucario", ["lucarionite", null, null]);
    const next = reducer(start, {
      type: "applyBuild",
      heldItemIds: ["attack-weight", "weakness-policy", "scope-lens"],
    });
    expect(next.heldItemIds).toEqual(["lucarionite", "weakness-policy", "scope-lens"]);
  });

  it("keeps a unique item supplied by applyBuild on its Pokémon", () => {
    const next = reducer(emptyLoadout("mewtwoy"), {
      type: "applyBuild",
      heldItemIds: ["mewtwonite-y", "muscle-band", "rapid-fire-scarf"],
    });
    expect(next.heldItemIds).toEqual(["mewtwonite-y", "muscle-band", "rapid-fire-scarf"]);
  });

  it("strips unique items from applyBuild on the wrong Pokémon", () => {
    const next = reducer(emptyLoadout("pikachu"), {
      type: "applyBuild",
      heldItemIds: ["rusted-sword", "muscle-band", "rapid-fire-scarf"],
    });
    expect(next.heldItemIds).toEqual([null, "muscle-band", "rapid-fire-scarf"]);
  });

  it("keeps the unique item after reset on its Pokémon", () => {
    const start = loadout("mega-charizard-x", ["charizardite-x", "scope-lens", "attack-weight"]);
    const next = reducer(start, { type: "reset" });
    expect(next.heldItemIds).toEqual(["charizardite-x", null, null]);
    expect(next.pokemonId).toBe("mega-charizard-x");
  });

  it("strips unique items when loading a mismatched saved loadout", () => {
    const next = reducer(emptyLoadout(), {
      type: "load",
      loadout: loadout("pikachu", ["gyaradosite", "leftovers", null]),
    });
    expect(next.heldItemIds).toEqual([null, "leftovers", null]);
  });
});
