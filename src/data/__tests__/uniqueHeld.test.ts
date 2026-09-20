import { describe, expect, it } from "vitest";
import { heldItems, pokemonList } from "../gameData";
import type { HeldItem, Pokemon, PokemonBuild } from "../../types";
import {
  isUniqueHeldItemId,
  uniqueHeldItemIdForPokemon,
  pokemonIdForUniqueHeldItem,
  uniqueHeldItemIdsFrom,
  uniqueHeldOwnerByItemIdFrom,
} from "../uniqueHeld";

const EXPECTED_OWNERS: Record<string, string> = {
  "charizardite-x": "mega-charizard-x",
  "charizardite-y": "mega-charizard-y",
  gyaradosite: "mega-gyarados",
  lucarionite: "mega-lucario",
  "mewtwonite-x": "mewtwox",
  "mewtwonite-y": "mewtwoy",
  "rusted-sword": "zacian",
};

function uniqueItem(id: string): HeldItem {
  return {
    id,
    displayName: id,
    iconAsset: "",
    description: "",
    statsByGrade: {},
    conditionalEffects: [],
  };
}

function gradedItem(id: string): HeldItem {
  return {
    id,
    displayName: id,
    iconAsset: "",
    description: "",
    statsByGrade: { 40: { attack: 1 } },
    conditionalEffects: [],
  };
}

function pokemonWithBuilds(id: string, heldItemIds: string[][]): Pokemon {
  const builds: PokemonBuild[] = heldItemIds.map((ids, i) => ({
    name: `Build ${i}`,
    heldItemIds: ids,
    emblems: [],
  }));
  return {
    id,
    displayName: id,
    role: "AllRounder",
    attackType: "physical",
    difficulty: 1,
    imageAsset: "",
    iconAsset: "",
    evolutions: [],
    baseStatsByLevel: [],
    moves: [],
    passiveAbility: {
      id: "p",
      name: "P",
      description: "",
      effects: [],
    },
    builds,
  };
}

describe("uniqueHeldItemIdsFrom", () => {
  it("selects items that have no per-grade stats", () => {
    const ids = uniqueHeldItemIdsFrom([gradedItem("muscle-band"), uniqueItem("lucarionite")]);
    expect([...ids]).toEqual(["lucarionite"]);
  });
});

describe("uniqueHeldOwnerByItemIdFrom", () => {
  it("maps each unique item to the Pokémon whose builds include it", () => {
    const owners = uniqueHeldOwnerByItemIdFrom(
      [
        pokemonWithBuilds("mega-lucario", [["lucarionite", "attack-weight"]]),
        pokemonWithBuilds("pikachu", [["muscle-band", "scope-lens"]]),
      ],
      new Set(["lucarionite"]),
    );
    expect(owners.get("lucarionite")).toBe("mega-lucario");
    expect(owners.size).toBe(1);
  });

  it("leaves a unique item unowned when no build lists it", () => {
    const owners = uniqueHeldOwnerByItemIdFrom(
      [pokemonWithBuilds("pikachu", [["muscle-band"]])],
      new Set(["rusted-sword"]),
    );
    expect(owners.has("rusted-sword")).toBe(false);
  });
});

describe("live unique held items", () => {
  it("covers the seven Mega Stones and Rusted Sword", () => {
    const unique = heldItems.filter((i) => Object.keys(i.statsByGrade).length === 0);
    expect(unique.map((i) => i.id).sort()).toEqual(Object.keys(EXPECTED_OWNERS).sort());
  });

  it("affixes each unique item to exactly one Pokémon from builds", () => {
    for (const [itemId, pokemonId] of Object.entries(EXPECTED_OWNERS)) {
      expect(isUniqueHeldItemId(itemId)).toBe(true);
      expect(pokemonIdForUniqueHeldItem(itemId)).toBe(pokemonId);
      expect(uniqueHeldItemIdForPokemon(pokemonId)).toBe(itemId);
    }
  });

  it("does not affix unique items to unrelated Pokémon", () => {
    expect(uniqueHeldItemIdForPokemon("lucario")).toBeNull();
    expect(uniqueHeldItemIdForPokemon("charizard")).toBeNull();
    expect(uniqueHeldItemIdForPokemon("gyarados")).toBeNull();
    expect(uniqueHeldItemIdForPokemon("pikachu")).toBeNull();
    expect(uniqueHeldItemIdForPokemon(null)).toBeNull();
  });

  it("does not treat graded held items as unique", () => {
    expect(isUniqueHeldItemId("muscle-band")).toBe(false);
    expect(isUniqueHeldItemId("missing-item")).toBe(false);
  });

  it("keeps the live owner map aligned with roster builds", () => {
    const owners = uniqueHeldOwnerByItemIdFrom(pokemonList, uniqueHeldItemIdsFrom(heldItems));
    expect(Object.fromEntries(owners)).toEqual(EXPECTED_OWNERS);
  });
});
