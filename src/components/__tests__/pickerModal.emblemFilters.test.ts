import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMBLEM_PICKER_FILTERS_KEY } from "../../state/rememberedFilters";
import { PickerModal, type PickItem } from "../PickerModal";

const items: PickItem[] = [
  { id: "keep", name: "Keepmon", icon: "/keep.png" },
  { id: "color-only", name: "Colormon", icon: "/color.png" },
  { id: "stat-only", name: "Statmon", icon: "/stat.png" },
  { id: "drop", name: "Dropmon", icon: "/drop.png" },
];

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

function markup(overrides: Partial<Parameters<typeof PickerModal>[0]> = {}): string {
  return renderToStaticMarkup(
    createElement(PickerModal, {
      title: "Choose Emblem",
      items,
      onPick: () => {},
      onClose: () => {},
      ...overrides,
    }),
  );
}

describe("Choose Emblem stat filters", () => {
  it("leaves held and battle pickers without a stats row", () => {
    installStorage();
    const html = markup();
    expect(html).toContain("Keepmon");
    expect(html).toContain("Dropmon");
    expect(html).not.toContain(">Stats<");
    expect(html).not.toContain("Clear filters");
    expect(html).not.toContain("No emblems match these filters.");
  });

  it("shows the inventory stat controls and the full grid when nothing is saved", () => {
    installStorage();
    const html = markup({
      grades: true,
      filterByEmblemStats: true,
      matchesEmblemStats: () => false,
    });
    expect(html).toContain(">Stats<");
    expect(html).toContain('aria-label="Positive"');
    expect(html).toContain('aria-label="Negative"');
    expect(html).toContain(">Attack<");
    expect(html).not.toContain("Clear filters");
    expect(html).toContain("Keepmon");
    expect(html).toContain("Dropmon");
    expect(html).toContain("4 shown");
    expect(html).not.toContain("No emblems match these filters.");
  });

  it("restores color, owned, stat, and sign, and hides tiles that fail any of them", () => {
    installStorage({
      [EMBLEM_PICKER_FILTERS_KEY]: JSON.stringify({
        color: "brown",
        ownedOnly: true,
        stat: "defense",
        sign: "neg",
      }),
    });
    const html = markup({
      grades: true,
      owned: new Set(["keep:gold"]),
      filterByEmblemStats: true,
      filters: [
        {
          label: "brown",
          activeColor: "#8b5a2b",
          predicate: (id) => id === "keep" || id === "color-only",
        },
      ],
      matchesEmblemStats: (id) => id === "keep" || id === "stat-only",
    });
    expect(html).toContain("Keepmon");
    expect(html).not.toContain("Colormon");
    expect(html).not.toContain("Statmon");
    expect(html).not.toContain("Dropmon");
    expect(html).toContain("Clear filters");
    expect(html).toMatch(/aria-pressed="true"[^>]*>Defense/);
    expect(html).toMatch(/aria-label="Negative"[^>]*aria-pressed="true"/);
    expect(html).toMatch(/aria-pressed="true"[^>]*#8b5a2b/);
    expect(html).toContain("1 shown");
    expect(html).toContain("− Defense · Brown · owned");
  });

  it("says when the stat filter empties the grid", () => {
    installStorage({
      [EMBLEM_PICKER_FILTERS_KEY]: JSON.stringify({
        color: null,
        ownedOnly: false,
        stat: "hp",
        sign: "pos",
      }),
    });
    const html = markup({
      grades: true,
      filterByEmblemStats: true,
      matchesEmblemStats: () => false,
    });
    expect(html).toContain("No emblems match these filters.");
    expect(html).toContain("0 shown");
    expect(html).toContain("+ HP");
    expect(html).not.toContain("Keepmon");
  });
});
