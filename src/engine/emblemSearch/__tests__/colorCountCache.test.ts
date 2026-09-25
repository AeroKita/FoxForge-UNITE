import { describe, expect, it } from "vitest";
import { makeEmblem } from "../../__tests__/fixtures";
import { buildCandidatePool } from "../adapt";
import { countConstrainedBuilds, countExactEnumerationSpace, takeColorDpRuns } from "../pool";
import { isExactColorModeFeasible, resolveColorSearchMode } from "../searchPresets";
import type { EmblemCandidate } from "../types";
import type { EmblemColor } from "../../../types";

function poolOf(prefix: string, colors: EmblemColor[], n: number): EmblemCandidate[] {
  const emblems = Array.from({ length: n }, (_, i) =>
    makeEmblem(`${prefix}-${i}`, colors, { attack: 1 }),
  );
  return buildCandidatePool(emblems, { grades: ["gold"] });
}

describe("color-count DP cache", () => {
  it("runs each distinct DP once per pool and target set", () => {
    const pool = [...poolOf("cache-brown", ["brown"], 12), ...poolOf("cache-white", ["white"], 8)];
    const targets = new Map<EmblemColor, number>([["brown", 4]]);

    takeColorDpRuns();
    const constrained = countConstrainedBuilds(pool, targets);
    const again = countConstrainedBuilds(pool, targets);
    const sameSpace = countExactEnumerationSpace(pool, targets, 10, true);
    expect(again).toBe(constrained);
    expect(sameSpace).toBe(constrained);
    expect(takeColorDpRuns()).toBe(1);

    const nameSpace = countExactEnumerationSpace(pool, targets, 10, false);
    expect(nameSpace).not.toBeNull();
    expect(takeColorDpRuns()).toBe(1);

    resolveColorSearchMode(pool, targets, 10, false);
    isExactColorModeFeasible(pool, targets, 10, false);
    expect(takeColorDpRuns()).toBe(0);
  });

  it("reuses a count when a new array has the same candidates", () => {
    const pool = poolOf("cache-copy", ["green"], 10);
    const targets = new Map<EmblemColor, number>([["green", 3]]);
    takeColorDpRuns();
    const first = countConstrainedBuilds(pool, targets);
    const copy = pool.map((c) => ({ ...c, colors: [...c.colors] }));
    expect(countConstrainedBuilds(copy, targets)).toBe(first);
    expect(takeColorDpRuns()).toBe(1);
  });
});
