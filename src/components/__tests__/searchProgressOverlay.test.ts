import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SearchProgressOverlay } from "../SearchProgressOverlay";

describe("SearchProgressOverlay", () => {
  it("steps the Searching dots and parks a decorative Rotom beside the title", () => {
    const html = renderToStaticMarkup(
      createElement(SearchProgressOverlay, {
        progress: { pct: 45, label: "Smart search · 4 workers", candidates: 1768228 },
        eta: "~4s remaining",
        onCancel: () => {},
      }),
    );

    expect(html).toContain('aria-label="Searching"');
    expect(html).toMatch(/aria-hidden="true">\s*Searching/);
    expect(html).toContain('class="searching-dots"');
    expect(html.match(/<span>\.<\/span>/g)).toHaveLength(3);
    expect(html).toContain("rotom.gif");
    expect(html).toContain("rotom-still");
    expect(html.match(/<img[^>]*alt=""[^>]*>/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(html).toContain("Smart search · 4 workers");
    expect(html).toContain("45%");
    expect(html).toContain("~4s remaining");
    expect(html).toContain("1,768,228 evaluated");
    expect(html).toContain("Cancel");
  });
});
