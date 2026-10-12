import { describe, expect, it } from "vitest";
import {
  damageTakenWithReduction,
  effectiveHp,
  inMatchMoveSpeed,
  physicalDamageTaken,
  rawDamage,
  specialDamageTaken,
} from "../formulas";

describe("rawDamage (RSB)", () => {
  it("computes FLOOR(R*stat + S*(level-1) + B)", () => {
    // 2.21*429 + 14*12 + 540 = 948.09 + 168 + 540 = 1656.09
    expect(rawDamage(2.21, 429, 14, 13, 540)).toBe(1656);
  });

  it("truncates, never rounds", () => {
    expect(rawDamage(1, 100, 0, 1, 0.9)).toBe(100);
    expect(rawDamage(0.999, 1000, 0, 1, 0)).toBe(999);
  });

  it("level 1 contributes zero slider", () => {
    expect(rawDamage(1, 100, 50, 1, 10)).toBe(110);
  });
});

describe("mitigation", () => {
  it("physical: FLOOR(raw * 600 / (600 + Def))", () => {
    // 1000 * 600 / 990 = 606.06...
    expect(physicalDamageTaken(1000, 390)).toBe(606);
  });

  it("special: FLOOR(raw * 600 / (600 + SpDef))", () => {
    // 1000 * 600 / 900 = 666.66...
    expect(specialDamageTaken(1000, 300)).toBe(666);
  });

  it("zero defense passes damage through", () => {
    expect(physicalDamageTaken(1000, 0)).toBe(1000);
  });

  it("flat reductions apply after mitigation, double-floored", () => {
    // floor(floor(606.06) * 0.7) = floor(424.2) = 424
    expect(damageTakenWithReduction(1000, 390, 0.3)).toBe(424);
  });
});

describe("inMatchMoveSpeed", () => {
  it("softens internal move speed on the battle-spec curve", () => {
    // wikiwiki.jp バトルに関する仕様#ms worked example: 6692 → 6071.
    expect(inMatchMoveSpeed(6692)).toBe(6071);
    // Issue #76: 5748 sits in the 5000–5750 band → 5000 + 0.8×748 = 5598.4.
    expect(inMatchMoveSpeed(5748)).toBeCloseTo(5598.4, 10);
    // 2500–5000 is unchanged, so the in-combat 4790 row is already in-match.
    expect(inMatchMoveSpeed(4790)).toBe(4790);
    expect(inMatchMoveSpeed(-10)).toBe(1250);
    expect(inMatchMoveSpeed(0)).toBe(1250);
    expect(inMatchMoveSpeed(2500)).toBe(2500);
    expect(inMatchMoveSpeed(5000)).toBe(5000);
    expect(inMatchMoveSpeed(5750)).toBe(5600);
    expect(inMatchMoveSpeed(12550)).toBe(9000);
  });
});

describe("effectiveHp", () => {
  it("MaxHP * (1 + Def/600)", () => {
    expect(effectiveHp(7249, 390)).toBeCloseTo(11960.85, 5);
    expect(effectiveHp(1000, 0)).toBe(1000);
  });
});
