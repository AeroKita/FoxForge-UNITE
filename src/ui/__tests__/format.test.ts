import { describe, it, expect } from "vitest";
import { formatExactDelta, formatExactStatValue, heldItemStatLines, STAT_ROWS } from "../format";

describe("exact held-item stat formatting", () => {
  it("shows fractional attack without rounding (Muscle Band G31)", () => {
    expect(formatExactDelta(15.25, "int")).toBe("+15.25");
    expect(formatExactStatValue(17.5, "int")).toBe("17.5");
  });

  it("shows fractional attack speed without rounding to one decimal", () => {
    expect(formatExactDelta(0.07625, "percent")).toBe("+7.625%");
    expect(formatExactStatValue(0.0875, "percent")).toBe("8.75%");
  });

  it("keeps whole integers clean", () => {
    expect(formatExactStatValue(15, "int")).toBe("15");
    expect(formatExactDelta(15, "int")).toBe("+15");
  });

  it("heldItemStatLines never rounds", () => {
    const lines = heldItemStatLines({ attack: 15.25, attackSpeed: 0.07625 });
    expect(lines.find((l) => l.key === "attack")?.value).toBe("+15.25");
    expect(lines.find((l) => l.key === "attackSpeed")?.value).toBe("+7.625%");
  });

  it("labels moveSpeed as Speed on held-item and emblem flats", () => {
    expect(STAT_ROWS.find((r) => r.key === "moveSpeed")?.label).toBe("Speed");
    expect(heldItemStatLines({ moveSpeed: 175 })[0]?.label).toBe("Speed");
  });
});
