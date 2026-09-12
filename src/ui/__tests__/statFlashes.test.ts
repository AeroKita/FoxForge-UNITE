import { describe, it, expect } from "vitest";
import { dockFlashDeltas, retainFlashBaseline } from "../statFlashes";

const KEYS = ["hp", "offense", "moveSpeed", "critRate"] as const;
type Dock = Record<(typeof KEYS)[number], number>;

function stats(partial: Partial<Dock> = {}): Dock {
  return { hp: 7000, offense: 500, moveSpeed: 4000, critRate: 0.1, ...partial };
}

describe("retainFlashBaseline", () => {
  it("uses the previous snapshot when no window is open", () => {
    const prev = stats({ offense: 520 });
    expect(retainFlashBaseline(null, prev)).toBe(prev);
  });

  it("keeps the first snapshot while the window is open", () => {
    const first = stats({ offense: 520 });
    const laterPrev = stats({ offense: 510 });
    expect(retainFlashBaseline(first, laterPrev)).toBe(first);
  });
});

describe("dockFlashDeltas", () => {
  it("reports the full change from baseline, not a single slider tick", () => {
    const baseline = stats({ offense: 520, critRate: 0.12 });
    // Grade 40 → 30: many ticks, last current vs original baseline.
    const atGrade30 = stats({ offense: 505, critRate: 0.09 });
    expect(dockFlashDeltas(atGrade30, baseline, KEYS)).toEqual({
      offense: -15,
      critRate: -0.03,
    });
  });

  it("clears chips when stats return to the baseline", () => {
    const baseline = stats({ offense: 520 });
    expect(dockFlashDeltas(baseline, baseline, KEYS)).toEqual({});
  });

  it("omits stats that did not move", () => {
    const baseline = stats();
    const current = stats({ hp: 7100 });
    expect(dockFlashDeltas(current, baseline, KEYS)).toEqual({ hp: 100 });
  });
});
