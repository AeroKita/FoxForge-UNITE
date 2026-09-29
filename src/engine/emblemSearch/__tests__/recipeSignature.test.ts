import { describe, expect, it } from "vitest";
import { flatSignatureValue } from "../recipeSearch";

describe("flatSignatureValue", () => {
  it("keeps a +0.6% crit flat distinct from zero", () => {
    expect(flatSignatureValue("critRate", 0.006)).toBe(0.006);
  });

  it("still rounds HP to an integer and attack to a tenth", () => {
    expect(flatSignatureValue("hp", 50.4)).toBe(50);
    expect(flatSignatureValue("attack", 2.44)).toBe(2.4);
  });
});
