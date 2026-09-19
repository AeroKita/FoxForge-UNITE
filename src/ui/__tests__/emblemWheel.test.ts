import { describe, expect, it } from "vitest";
import { setBonuses } from "../../data/gameData";
import type { EmblemColor, EmblemSlot, StatBlock } from "../../types";
import type { EmblemLoadoutImpact } from "../../engine/emblemSearch/pokemonScore";
import { MAX_EMBLEM_SLOTS } from "../../engine/emblems";
import { EMBLEM_COLOR_HEX } from "../colors";
import { formatDelta, STAT_ROWS } from "../format";
import { EMBLEM_SET_INFO } from "../emblemSets";
import {
  emblemFlatRows,
  emblemImpactRows,
  emblemOocMoveGain,
  equippedSetCaption,
  equippedSetDetail,
  equippedSetFillPercent,
  equippedSetRows,
  scaledWheelGeometry,
  slotsFromPicks,
  WHEEL_ARC_ALPHA,
  WHEEL_COIN_SIZE_PCT,
  WHEEL_GEOMETRY,
  WHEEL_MIN_NEIGHBOR_GAP_PX,
  wheelDesignMetrics,
  wheelSlotPositions,
  wheelTrackGradient,
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
    expect(gray.bonusPercent).not.toBeNull();

    const pink = rows[1];
    expect(pink.active).toBeNull();
    expect(pink.next).toBe(3);
    expect(pink.bonusPercent).toBeNull();

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

describe("equippedSetDetail", () => {
  it("names the current bonus, or that none is reached yet", () => {
    const rows = equippedSetRows(
      [slot("b1", ["brown"]), slot("b2", ["brown"]), slot("b3", ["brown"]), slot("p1", ["pink"])],
      setBonuses,
    );
    const byColor = new Map(rows.map((r) => [r.color, r]));
    expect(equippedSetDetail(byColor.get("brown")!)).toBe("+1% Atk");
    expect(equippedSetDetail(byColor.get("pink")!)).toBe("No set bonus yet");
  });

  it("spells out yellow Speed (Out of Combat) at the top tier and does not mention the next pip", () => {
    const rows = equippedSetRows(
      [
        ...Array.from({ length: 6 }, (_, i) => slot(`b${i}`, ["brown"])),
        ...Array.from({ length: 7 }, (_, i) => slot(`y${i}`, ["yellow"])),
        ...Array.from({ length: 7 }, (_, i) => slot(`g${i}`, ["gray"])),
      ],
      setBonuses,
    );
    const byColor = new Map(rows.map((r) => [r.color, r]));
    expect(equippedSetDetail(byColor.get("brown")!)).toBe("+4% Atk");
    expect(equippedSetDetail(byColor.get("yellow")!)).toBe("+12% Speed (Out of Combat)");
    expect(equippedSetDetail(byColor.get("gray")!)).toBe("−12 dmg");
  });
});

describe("equippedSetFillPercent", () => {
  it("is linear in count / top threshold, matching a 1-of-6 in-game sliver", () => {
    expect(equippedSetFillPercent(0, 6)).toBe(0);
    expect(equippedSetFillPercent(1, 6)).toBeCloseTo(100 / 6, 5);
    expect(equippedSetFillPercent(6, 6)).toBe(100);
    expect(equippedSetFillPercent(3, 7)).toBeCloseTo((3 / 7) * 100, 5);
  });

  it("clamps over-full counts and treats a missing max as empty", () => {
    expect(equippedSetFillPercent(10, 6)).toBe(100);
    expect(equippedSetFillPercent(2, 0)).toBe(0);
    expect(equippedSetFillPercent(-1, 6)).toBe(0);
  });
});

describe("emblemFlatRows", () => {
  it("formats non-zero coin flats in STAT_ROWS order, without set-bonus math", () => {
    const rows = emblemFlatRows({ hp: 150.4, attack: 13, critRate: 0 });
    expect(rows.map((r) => r.key)).toEqual(["hp", "attack"]);
    expect(rows[0]).toEqual({
      key: "hp",
      label: STAT_ROWS.find((r) => r.key === "hp")!.label,
      delta: formatDelta(150.4, "int"),
      sign: "pos",
    });
    expect(rows[1]).toEqual({
      key: "attack",
      label: STAT_ROWS.find((r) => r.key === "attack")!.label,
      delta: formatDelta(13, "int"),
      sign: "pos",
    });
  });

  it("keeps one decimal when precise, matching Builds Emblem Stats in Advanced", () => {
    const rows = emblemFlatRows({ attack: 13.5 }, true);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.delta).toBe("+13.5");
  });

  it("returns [] for empty or missing flats", () => {
    expect(emblemFlatRows(null)).toEqual([]);
    expect(emblemFlatRows({})).toEqual([]);
  });
});

describe("emblemImpactRows", () => {
  it("formats signed deltas from emblemDelta in STAT_ROWS order, with no before/after totals", () => {
    const impact = {
      effective: { ...zeros(), hp: 6946, attack: 400, critRate: 0.125 },
      emblemDelta: { hp: 408, attack: -5, critRate: 0.05 },
      emblemLoadout: { slots: [], flatTotals: {}, activeSetBonuses: [] },
      oocMoveSpeed: null,
    } as EmblemLoadoutImpact;

    const rows = emblemImpactRows(impact);
    expect(rows.map((r) => r.key)).toEqual(["hp", "attack", "critRate"]);
    expect(rows[0]).toEqual({
      key: "hp",
      label: STAT_ROWS.find((r) => r.key === "hp")!.label,
      delta: formatDelta(408, "int"),
      sign: "pos",
    });
    expect(rows[1]).toEqual({
      key: "attack",
      label: STAT_ROWS.find((r) => r.key === "attack")!.label,
      delta: formatDelta(-5, "int"),
      sign: "neg",
    });
    expect(rows[2]).toEqual({
      key: "critRate",
      label: STAT_ROWS.find((r) => r.key === "critRate")!.label,
      delta: formatDelta(0.05, "percent"),
      sign: "pos",
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
      label: "Speed (Out of Combat)",
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

describe("wheelTrackGradient", () => {
  it("builds ten 36° conic stops from each slot's first color", () => {
    const slots: (EmblemSlot | null)[] = [
      slot("brown-0", ["brown"]),
      slot("dual-1", ["brown", "white"]),
      null,
      ...Array.from({ length: 7 }, (_, i) => slot(`brown-${i + 3}`, ["brown"])),
    ];
    const css = wheelTrackGradient(slots);
    expect(css.startsWith("conic-gradient(from -18deg,")).toBe(true);

    const inner = css.slice("conic-gradient(from -18deg,".length).replace(/\)$/, "").trim();
    const stops = inner.split(/,\s*/);
    expect(stops).toHaveLength(10);

    const brown = `${EMBLEM_COLOR_HEX.brown}${WHEEL_ARC_ALPHA}`;
    expect(stops[0]).toBe(`${brown} 0deg 36deg`);
    expect(stops[1]).toBe(`${brown} 36deg 72deg`);
    expect(stops[2]).toBe("var(--color-raise) 72deg 108deg");
    expect(stops[9]).toBe(`${brown} 324deg 360deg`);
  });
});

function assertWheelFits(m: ReturnType<typeof wheelDesignMetrics>, minGap = 0) {
  expect(m.slotR - m.coinR).toBeGreaterThanOrEqual(m.bandInner);
  expect(m.slotR + m.coinR).toBeLessThanOrEqual(m.bandOuter);
  expect(m.outerWithGlyph).toBeLessThanOrEqual(m.half);
  expect(m.neighborGap).toBeGreaterThanOrEqual(minGap);
}

describe("WHEEL_GEOMETRY", () => {
  it("keeps coins and color badges inside the ring without overlapping neighbors", () => {
    expect(WHEEL_GEOMETRY.coinPx).toBe(64);
    expect(WHEEL_GEOMETRY.box / WHEEL_GEOMETRY.coinPx).toBeCloseTo(280 / 44, 2);
    assertWheelFits(wheelDesignMetrics(WHEEL_GEOMETRY), WHEEL_MIN_NEIGHBOR_GAP_PX);
  });
});

describe("WHEEL_COIN_SIZE_PCT", () => {
  it("is coinPx / box so CSS percent sizing tracks the design ratio", () => {
    expect(WHEEL_COIN_SIZE_PCT).toBeCloseTo((64 / 407) * 100, 5);
  });
});

describe("scaledWheelGeometry", () => {
  it("matches design metrics at the design box", () => {
    const g = scaledWheelGeometry(WHEEL_GEOMETRY.box);
    expect(g.coinPx).toBeCloseTo(WHEEL_GEOMETRY.coinPx);
    expect(g.glyphHangPx).toBeCloseTo(WHEEL_GEOMETRY.glyphHangPx);
    assertWheelFits(wheelDesignMetrics(g), WHEEL_MIN_NEIGHBOR_GAP_PX);
  });

  it("keeps a non-positive width at the design size", () => {
    expect(scaledWheelGeometry(0).box).toBe(WHEEL_GEOMETRY.box);
    expect(scaledWheelGeometry(-10).coinPx).toBe(WHEEL_GEOMETRY.coinPx);
  });

  it("scales coins and glyph hang so they do not overlap on iPhone-class inner widths", () => {
    // <main> px-3 (24) + CollapsibleCard px-4 (32)
    const chrome = 24 + 32;
    for (const cssWidth of [393, 360, 320]) {
      const inner = cssWidth - chrome;
      const g = scaledWheelGeometry(inner);
      expect(g.box).toBe(inner);
      expect(g.coinPx).toBeCloseTo(WHEEL_GEOMETRY.coinPx * (inner / WHEEL_GEOMETRY.box));
      expect(g.coinPx).toBeLessThan(WHEEL_GEOMETRY.coinPx);
      assertWheelFits(wheelDesignMetrics(g));
    }
  });
});

describe("slotsFromPicks", () => {
  it("keeps known picks in order and drops unknown ids", () => {
    const brown = slot("001-bulbasaur", ["brown"]).emblem;
    const resolve = (id: string) => (id === brown.id ? brown : undefined);
    expect(
      slotsFromPicks(
        [
          { emblemId: "001-bulbasaur", grade: "gold" },
          { emblemId: "missing", grade: "silver" },
          { emblemId: "001-bulbasaur", grade: "bronze" },
        ],
        resolve,
      ),
    ).toEqual([
      { emblem: brown, grade: "gold" },
      { emblem: brown, grade: "bronze" },
    ]);
  });
});
