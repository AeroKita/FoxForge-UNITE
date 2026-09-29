import { describe, expect, it } from "vitest";
import { deriveBuild } from "../derive";
import { decodeLoadout, emptyLoadout, encodeLoadout } from "../../state/loadout";

describe("deriveBuild — share-hash grades", () => {
  it("does not crash when a shared loadout includes an unknown emblem grade", () => {
    const encoded = encodeLoadout({
      ...emptyLoadout("lucario"),
      emblems: [
        { emblemId: "025-pikachu", grade: "diamond" as never },
        { emblemId: "001-bulbasaur", grade: "gold" },
      ],
    });
    const decoded = decodeLoadout(encoded);
    expect(decoded).not.toBeNull();
    expect(() => deriveBuild(decoded!, true, [40, 40, 40])).not.toThrow();
    expect(decoded!.emblems).toEqual([{ emblemId: "001-bulbasaur", grade: "gold" }]);
  });
});

describe("deriveBuild — out-of-combat move speed (issue #25)", () => {
  it("Float Stone raises OOC move speed above the in-combat stat (real bundle data)", () => {
    const loadout = {
      ...emptyLoadout("absol"),
      heldItemIds: ["float-stone", null, null],
    };
    const d = deriveBuild(loadout, true, [40, 40, 40]);
    expect(d.effective).not.toBeNull();
    // grade-40 Float Stone = +20% OOC on top of the in-combat move speed.
    expect(d.oocMoveSpeed).toBe(Math.floor(d.effective!.moveSpeed * 1.2));
    expect(d.oocMoveSpeed!).toBeGreaterThan(d.effective!.moveSpeed);
  });

  it("yellow set bonus raises OOC move speed but not the in-combat stat", () => {
    const yellowIds = [
      "025-pikachu",
      "026-raichu",
      "081-magnemite",
      "082-magneton",
      "125-electabuzz",
      "135-jolteon",
      "100-voltorb",
    ];
    const loadout = {
      ...emptyLoadout("absol"),
      emblems: yellowIds.map((emblemId) => ({ emblemId, grade: "gold" as const })),
    };
    const d = deriveBuild(loadout, true, [40, 40, 40]);
    expect(d.emblemLoadout.activeSetBonuses.some((b) => b.color === "yellow")).toBe(true);
    // Yellow is gated out of the in-combat block but must lift OOC speed.
    expect(d.oocMoveSpeed!).toBeGreaterThan(d.effective!.moveSpeed);
  });
});

describe("deriveBuild — crit emblem flats and active crit buffs", () => {
  const tenFarfetchd = Array.from({ length: 10 }, () => ({
    emblemId: "083-farfetch-d",
    grade: "gold" as const,
  }));

  it("keeps a +6% crit emblem stack on Machamp at level 15", () => {
    const d = deriveBuild(
      { ...emptyLoadout("machamp"), emblems: tenFarfetchd },
      true,
      [40, 40, 40],
    );
    // Innate 20% + 10 × 0.6%.
    expect(d.effective!.critRate).toBeCloseTo(0.26, 6);
  });

  it("adds grade-40 Scope Lens and Razor Claw on top of emblem crit", () => {
    const withCrit = deriveBuild(
      {
        ...emptyLoadout("machamp"),
        emblems: tenFarfetchd,
        heldItemIds: ["scope-lens", "razor-claw", null],
      },
      true,
      [40, 40, 40],
    );
    const itemsOnly = deriveBuild(
      {
        ...emptyLoadout("machamp"),
        heldItemIds: ["scope-lens", "razor-claw", null],
      },
      true,
      [40, 40, 40],
    );
    // 20 + 6 + 7 + 2.35, and 20 + 7 + 2.35.
    expect(withCrit.effective!.critRate).toBeCloseTo(0.3535, 6);
    expect(itemsOnly.effective!.critRate).toBeCloseTo(0.2935, 6);
  });

  it("adds Mew's cooldown-reduction flat", () => {
    const bare = deriveBuild(emptyLoadout("machamp"), true, [40, 40, 40]);
    const withMew = deriveBuild(
      {
        ...emptyLoadout("machamp"),
        emblems: [{ emblemId: "151-mew", grade: "gold" }],
      },
      true,
      [40, 40, 40],
    );
    expect(withMew.effective!.cdr - bare.effective!.cdr).toBeCloseTo(0.006, 6);
  });

  it("Submission+ adds 10 crit points and marks crit buffed", () => {
    const off = deriveBuild(emptyLoadout("machamp"), true, [40, 40, 40]);
    const on = deriveBuild(
      { ...emptyLoadout("machamp"), activeBoostIds: ["move:Submission+"] },
      true,
      [40, 40, 40],
    );
    expect(on.effective!.critRate - off.effective!.critRate).toBeCloseTo(0.1, 6);
    expect(on.buffedStats.has("critRate")).toBe(true);
  });

  it("Cross Chop adds 5 crit points without changing attacks per second", () => {
    const off = deriveBuild(emptyLoadout("machamp"), true, [40, 40, 40]);
    const on = deriveBuild(
      { ...emptyLoadout("machamp"), activeBoostIds: ["move:Cross Chop"] },
      true,
      [40, 40, 40],
    );
    expect(on.effective!.critRate - off.effective!.critRate).toBeCloseTo(0.05, 6);
    expect(on.attackSpeed!.attacksPerSecond).toBeCloseTo(off.attackSpeed!.attacksPerSecond, 6);
  });

  it("Inteleon Unite Buff doubles critical-hit rate", () => {
    const off = deriveBuild(emptyLoadout("inteleon"), true, [40, 40, 40]);
    const on = deriveBuild(
      { ...emptyLoadout("inteleon"), activeBoostIds: ["move:Unite Buff"] },
      true,
      [40, 40, 40],
    );
    expect(on.effective!.critRate).toBeCloseTo(off.effective!.critRate * 2, 6);
  });
});
