import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { emptyLoadout, type SavedLoadout } from "../../state/loadout";
import { CompareView, SidePicker } from "../CompareView";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => children ?? null,
  RadarChart: ({ children }: { children?: ReactNode }) =>
    createElement("div", { "data-testid": "radar" }, children),
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  Radar: (props: { name?: string; stroke?: string; fill?: string }) =>
    createElement("div", {
      "data-radar": props.name,
      "data-stroke": props.stroke,
      "data-fill": props.fill,
    }),
}));

vi.mock("../../state/store", () => ({
  useStore: () => ({
    loadout: emptyLoadout("lucario"),
    saved: [],
    heldItemGrade: () => 30,
    theme: "light" as const,
  }),
}));

const savedLucario: SavedLoadout = {
  ...emptyLoadout("lucario"),
  id: "saved-lucario",
  name: "Lane Lucario",
  savedAt: 0,
};

function identityContext(html: string, needle: string): string {
  const at = html.indexOf(needle);
  expect(at).toBeGreaterThanOrEqual(0);
  return html.slice(Math.max(0, at - 700), at);
}

function row(html: string, label: string): string {
  const match = html.match(new RegExp(`<tr[^>]*>[\\s\\S]*?>${label}<[\\s\\S]*?</tr>`));
  expect(match, `row ${label}`).not.toBeNull();
  return match![0];
}

function cells(fragment: string, tag: "td" | "th"): string[] {
  return [...fragment.matchAll(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "g"))].map(
    (match) => match[0],
  );
}

describe("Compare identity rows", () => {
  it("borders the current working build with build A's chart color", () => {
    const html = renderToStaticMarkup(
      createElement(SidePicker, {
        label: "A",
        selection: { source: "current", pokemonId: "lucario", variant: 0, savedId: null },
        onChange: () => {},
        saved: [],
        current: emptyLoadout("lucario"),
        onOpenPicker: () => {},
      }),
    );
    expect(identityContext(html, "Your current working build")).toContain("border-compare-a");
    expect(identityContext(html, "Your current working build")).not.toContain("border-compare-b");
  });

  it("borders the preset Pokémon row with build B's chart color", () => {
    const html = renderToStaticMarkup(
      createElement(SidePicker, {
        label: "B",
        selection: { source: "recommended", pokemonId: "lucario", variant: 0, savedId: null },
        onChange: () => {},
        saved: [],
        current: emptyLoadout("lucario"),
        onOpenPicker: () => {},
      }),
    );
    const chip = identityContext(html, 'font-medium">Lucario');
    expect(chip).toContain("border-compare-b");
    expect(chip).not.toContain("border-compare-a");
  });

  it("borders a saved loadout with its side color", () => {
    const html = renderToStaticMarkup(
      createElement(SidePicker, {
        label: "A",
        selection: { source: "saved", pokemonId: "lucario", variant: 0, savedId: savedLucario.id },
        onChange: () => {},
        saved: [savedLucario],
        current: emptyLoadout("lucario"),
        onOpenPicker: () => {},
      }),
    );
    expect(identityContext(html, "Lane Lucario")).toContain("border-compare-a");
  });
});

describe("Compare stat columns", () => {
  const html = renderToStaticMarkup(createElement(CompareView));

  it("washes the A and B columns from the header through Attacks / sec", () => {
    for (const label of ["HP", "Attacks / sec"]) {
      const body = cells(row(html, label), "td");
      expect(body[1]).toContain("bg-compare-a-wash");
      expect(body[2]).toContain("bg-compare-b-wash");
      expect(body[3]).not.toContain("compare-a");
      expect(body[3]).not.toContain("compare-b");
    }
    const head = cells(html.match(/<thead[\s\S]*?<\/thead>/)![0], "th");
    expect(head[1]).toContain("bg-compare-a-wash");
    expect(head[2]).toContain("bg-compare-b-wash");
    expect(head[3]).not.toContain("compare-");
  });

  it("paints the legend and the radar with the shared theme tokens", () => {
    expect(html).toContain("rounded-full bg-compare-a");
    expect(html).toContain("rounded-full bg-compare-b");
    expect(html).not.toContain("#4f5bd5");
    expect(html).not.toContain("#9a6207");
    expect(html).not.toContain("#22d3ee");
    expect(html).not.toContain("#f59e0b");
    expect(html).toContain('data-stroke="var(--color-compare-a)"');
    expect(html).toContain('data-fill="var(--color-compare-a)"');
    expect(html).toContain('data-stroke="var(--color-compare-b)"');
    expect(html).toContain('data-fill="var(--color-compare-b)"');
  });
});
