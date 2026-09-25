import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { selectActiveBundle } from "./selectActiveBundle";

const schema = z.object({ n: z.number() });
const baseline = { n: 1 };

describe("selectActiveBundle", () => {
  it("does not parse the shipped baseline", () => {
    const parse = vi.fn((raw: unknown) => schema.parse(raw));
    const result = selectActiveBundle(baseline, baseline, parse);
    expect(parse).not.toHaveBeenCalled();
    expect(result).toEqual({ bundle: baseline, rejectedCache: false });
  });

  it("parses a cached remote bundle", () => {
    const raw = { n: 2 };
    const result = selectActiveBundle(baseline, raw, (value) => schema.parse(value));
    expect(result.bundle).toEqual({ n: 2 });
    expect(result.rejectedCache).toBe(false);
  });

  it("falls back to the baseline and flags a schema mismatch", () => {
    const result = selectActiveBundle(baseline, { n: "nope" }, (value) => schema.parse(value));
    expect(result.bundle).toBe(baseline);
    expect(result.rejectedCache).toBe(true);
  });

  it("rethrows errors that are not schema mismatches", () => {
    expect(() =>
      selectActiveBundle(baseline, { n: 3 }, () => {
        throw new Error("disk");
      }),
    ).toThrow("disk");
  });
});
