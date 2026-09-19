import { describe, expect, it } from "vitest";
import { setBonuses } from "../../data/gameData";
import type { EmblemColor, EmblemSlot, StatBlock } from "../../types";
import type { EmblemLoadoutImpact } from "../../engine/emblemSearch/pokemonScore";
import { MAX_EMBLEM_SLOTS } from "../../engine/emblems";
import { formatDelta, STAT_ROWS } from "../format";
import { EMBLEM_SET_INFO } from "../emblemSets";
import {
  emblemImpactRows,
  emblemOocMoveGain,
  equippedSetCaption,
  equippedSetRows,
  wheelSlotPositions,
} from "../emblemWheel";

function slot(name: string, colors: EmblemColor[]): EmblemSlot {
  return {
    emblem: {
      id: name,
      pokemonName: name,
      colors,
      iconAsset: "",
      statsByGrade: { bronze: {}, silver: {}, gold: {} },
    },
    grade: "gold",
  };
}

function zeros(): StatBlock {
  return {
    hp: 0,
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    critRate: 0,
    cdr: 0,
    lifesteal: 0,
    spLifesteal: 0,
    attackSpeed: 0,
    moveSpeed: 0,
  };
}

describe("wheelSlotPositions", () => {
  it("places ten slots on a ring, index 0 at the top, clockwise", () => {
    const radiusPct = 42;
    const positions = wheelSlotPositions(10, radiusPct);
    expect(positions).toHaveLength(10);

    expect(positions[0].left).toBeCloseTo(50, 5);
    expect(positions[0].top).toBeCloseTo(50 - radiusPct, 5);

    expect(positions[5].left).toBeCloseTo(50, 5);
    expect(positions[5].top).toBeCloseTo(50 + radiusPct, 5);

    expect(positions[2].left).toBeGreaterThan(50);

    const radii = positions.map((p) => Math.hypot(p.left - 50, p.top - 50));
    for (const r of radii) {
      expect(r).toBeCloseTo(radiusPct, 2);
    }
    expect(MAX_EMBLEM_SLOTS).toBe(10);
  });
});

describe("equippedSetRows", () => {
  it("lists only colors with count > 0, ordered by count then EMBLEM_SET_INFO", () => {
    const slots = [
      slot("pink-a", ["pink"]),
      slot("pink-b", ["pink"]),
      slot("gray-a", ["gray"]),
      slot("gray-b", ["gray"]),
      slot("gray-c", ["gray"]),
      slot("brown-a", ["brown"]),
    ];
    const rows = equippedSetRows(slots, setBonuses);
    expect(rows.map((r) => r.color)).toEqual(["gray", "pink", "brown"]);

    const gray = rows[0];
    expect(gray.tiers).toEqual([
      { count: 3, value: 3, reached: true },
      { count: 5, value: 6, reached: false },
      { count: 7, value: 12, reached: false },
    ]);
    expect(gray.active).toEqual({ count: 3, value: 3 });

    const pink = rows[1];
    expect(pink.active).toBeNull();
    expect(pink.next).toBe(3);

    const infoOrder = EMBLEM_SET_INFO.map((r) => r.color);
    expect(infoOrder.indexOf("gray")).toBeGreaterThan(infoOrder.indexOf("pink"));
    expect(infoOrder.indexOf("pink")).toBeGreaterThan(infoOrder.indexOf("brown"));
  });

  it("counts a dual-color emblem toward both colors", () => {
    const rows = equippedSetRows([slot("dual", ["pink", "gray"])], setBonuses);
    const byColor = new Map(rows.map((r) => [r.color, r]));
    expect(byColor.get("pink")?.count).toBe(1);
    expect(byColor.get("gray")?.count).toBe(1);
  });
});

describe("equippedSetCaption", () => {
  it("prints a short active bonus, else progress to the next threshold", () => {
    const rows = equippedSetRows(
      [
        slot("b1", ["brown"]),
        slot("b2", ["brown"]),
        slot("b3", ["brown"]),
        slot("b4", ["brown"]),
        slot("b5", ["brown"]),
        slot("b6", ["brown"]),
        slot("p1", ["pink"]),
      ],
      setBonuses,
    );
    const byColor = new Map(rows.map((r) => [r.color, r]));
    expect(equippedSetCaption(byColor.get("brown")!)).toBe("+4% Atk");
    expect(equippedSetCaption(byColor.get("pink")!)).toBe("1/3");
  });
});

describe("emblemImpactRows", () => {
  it("formats signed deltas from emblemDelta in STAT_ROWS order, with no before/after totals", () => {
    const impact = {
      effective: { ...zeros(), hp: 1000, attack: 400 },
      emblemDelta: { hp: 120, attack: -5 },
      emblemLoadout: { slots: [], flatTotals: {}, activeSetBonuses: [] },
      oocMoveSpeed: null,
    } as EmblemLoadoutImpact;

    const rows = emblemImpactRows(impact);
    expect(rows.map((r) => r.key)).toEqual(["hp", "attack"]);
    expect(rows[0]).toEqual({
      key: "hp",
      label: STAT_ROWS.find((r) => r.key === "hp")!.label,
      delta: formatDelta(120, "int"),
      sign: "pos",
    });
    expect(rows[1]).toEqual({
      key: "attack",
      label: STAT_ROWS.find((r) => r.key === "attack")!.label,
      delta: formatDelta(-5, "int"),
      sign: "neg",
    });
    expect(rows[0]).not.toHaveProperty("before");
    expect(rows[0]).not.toHaveProperty("after");
  });

  it("returns [] for a null impact", () => {
    expect(emblemImpactRows(null)).toEqual([]);
  });
});

describe("emblemOocMoveGain", () => {
  it("returns the extra out-of-combat move speed when yellow is active", () => {
    const impact = {
      effective: { ...zeros(), moveSpeed: 4545 },
      emblemDelta: { moveSpeed: 245 },
      emblemLoadout: {
        slots: [],
        flatTotals: {},
        activeSetBonuses: [{ color: "yellow", bonusPercent: 0.12 }],
      },
      oocMoveSpeed: 5090,
    } as EmblemLoadoutImpact;

    expect(emblemOocMoveGain(impact)).toEqual({
      label: "Move Speed (OOC)",
      delta: formatDelta(545, "int"),
      sign: "pos",
    });
  });

  it("returns null when yellow is not active", () => {
    const impact = {
      effective: { ...zeros(), moveSpeed: 4300 },
      emblemDelta: { moveSpeed: 21 },
      emblemLoadout: {
        slots: [],
        flatTotals: {},
        activeSetBonuses: [{ color: "brown", bonusPercent: 0.04 }],
      },
      oocMoveSpeed: 4300,
    } as EmblemLoadoutImpact;
    expect(emblemOocMoveGain(impact)).toBeNull();
    expect(emblemOocMoveGain(null)).toBeNull();
  });
});
