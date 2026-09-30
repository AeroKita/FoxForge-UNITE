import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmblemFilterBar, type EmblemFilterBarProps } from "../EmblemFilterBar";

const idle: EmblemFilterBarProps = {
  color: "all",
  onColor: () => {},
  stat: null,
  onStat: () => {},
  sign: null,
  onSign: () => {},
  onClear: () => {},
};

function markup(overrides: Partial<EmblemFilterBarProps> = {}): string {
  return renderToStaticMarkup(createElement(EmblemFilterBar, { ...idle, ...overrides }));
}

describe("EmblemFilterBar", () => {
  it("shows color chips and stat controls, with clear hidden until a filter is on", () => {
    const html = markup();
    expect(html).toContain("Color");
    expect(html).toContain("Stats");
    expect(html).toContain("Defense");
    expect(html).toContain('aria-label="Positive"');
    expect(html).toContain('aria-label="Negative"');
    expect(html).toContain(">All<");
    expect(html).not.toContain("Clear filters");
    expect(html).toContain('aria-pressed="false"');
  });

  it("presses the active color, sign, and stat, and offers clear", () => {
    const html = markup({ color: "blue", stat: "defense", sign: "neg" });
    expect(html).toContain("Clear filters");
    expect(html).toMatch(/aria-pressed="true"[^>]*>Defense/);
    expect(html).toMatch(/aria-label="Negative"[^>]*aria-pressed="true"/);
    expect(html).toMatch(/aria-label="blue"[^>]*aria-pressed="true"/);
  });
});
