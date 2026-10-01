import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMBLEM_PAGE_FILTERS_KEY, POKEMON_PICKER_ROLE_KEY } from "../../state/rememberedFilters";
import { InventoryManager } from "../InventoryManager";
import { PokemonPickerSheet } from "../PokemonPicker";

vi.mock("../../state/store", () => ({
  useStore: () => ({
    loadout: { pokemonId: null },
    dispatch: () => {},
    owned: new Set<string>(),
    toggleOwned: () => {},
    bulkSetOwned: () => {},
    ownedShareUrl: () => "",
    pendingOwnedImport: null,
    applyPendingOwnedImport: () => {},
    dismissPendingOwnedImport: () => {},
  }),
}));

function installStorage(seed: Record<string, string> = {}) {
  const memory = new Map(Object.entries(seed));
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  });
  return memory;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Choose a Pokémon restores the last role pill", () => {
  it("opens on All when the trainer has not picked a role", () => {
    installStorage();
    const html = renderToStaticMarkup(createElement(PokemonPickerSheet, { onClose: () => {} }));
    expect(html).toMatch(/aria-pressed="true"[^>]*>All</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Speedster</);
  });

  it("reopens on Speedster after that pill was saved", () => {
    installStorage({ [POKEMON_PICKER_ROLE_KEY]: "Speedster" });
    const html = renderToStaticMarkup(createElement(PokemonPickerSheet, { onClose: () => {} }));
    expect(html).toMatch(/aria-pressed="true"[^>]*>Speedster</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>All</);
  });
});

describe("Emblems page restores the last filters", () => {
  it("opens on gold and All when nothing was saved", () => {
    installStorage();
    const html = renderToStaticMarkup(createElement(InventoryManager));
    expect(html).toContain("Mark what Emblems you own!");
    expect(html).not.toContain("owned emblems are highlighted");
    expect(html).toContain("gold owned");
    expect(html).toMatch(/aria-label="All"[^>]*aria-pressed="true"/);
    expect(html).toMatch(/aria-label="green"[^>]*aria-pressed="false"/);
    expect(html).not.toContain("Clear filters");
  });

  it("returns to the saved grade, color, stat, and sign", () => {
    installStorage({
      [EMBLEM_PAGE_FILTERS_KEY]: JSON.stringify({
        grade: "silver",
        color: "green",
        stat: "defense",
        sign: "neg",
      }),
    });
    const html = renderToStaticMarkup(createElement(InventoryManager));
    expect(html).toContain("silver owned");
    expect(html).toMatch(/aria-label="green"[^>]*aria-pressed="true"/);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Defense/);
    expect(html).toMatch(/aria-label="Negative"[^>]*aria-pressed="true"/);
    expect(html).toContain("Clear filters");
  });
});
