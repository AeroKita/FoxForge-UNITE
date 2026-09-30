import { describe, expect, it } from "vitest";
import { availableActiveBoosts } from "../../engine/effects";
import { loadBundle } from "../../data/loadBundle";
import raw from "../../data/patch-current.json";
import { boostLevelGate, formatBoostEffect } from "../boostEffectText";

const bundle = loadBundle(raw);
const find = (id: string) => bundle.pokemon.find((p) => p.id === id)!;

describe("formatBoostEffect", () => {
  it("lists X Attack's attack and special attack bonuses beside attack speed", () => {
    const xAttack = bundle.battleItems?.find((i) => i.id === "x-attack");
    expect(xAttack).toBeDefined();
    const boosts = availableActiveBoosts(find("machamp"), [null, null, null], xAttack!);
    const x = boosts.find((b) => b.id === "x-attack")!;
    expect(formatBoostEffect(x, 15)).toBe("+25.0% AS, +20.0% Attack, +20.0% Sp. Atk");
  });

  it("lists Submission+ crit beside its attack speed", () => {
    const boosts = availableActiveBoosts(find("machamp"), [null, null, null], null);
    const sub = boosts.find((b) => b.id === "move:Submission+")!;
    expect(formatBoostEffect(sub, 15)).toBe("+50.0% AS, +10.0% Crit Rate");
  });

  it("lists Cross Chop crit without an attack-speed fragment", () => {
    const boosts = availableActiveBoosts(find("machamp"), [null, null, null], null);
    const chop = boosts.find((b) => b.id === "move:Cross Chop")!;
    expect(formatBoostEffect(chop, 15)).toBe("+5.0% Crit Rate");
    expect(formatBoostEffect(chop, 15)).not.toContain("AS");
  });

  it("describes Decidueye Basic Attack as the four-stack cap", () => {
    const boosts = availableActiveBoosts(find("decidueye"), [null, null, null], null);
    const basic = boosts.find((b) => b.id === "move:Basic Attack")!;
    expect(formatBoostEffect(basic, 15)).toBe("+12.0% AS");
  });

  it("describes Accelgor as cooldown reduction and Escavalier as an enemy slow", () => {
    const boosts = availableActiveBoosts(find("machamp"), [null, null, null], null);
    const accelgor = boosts.find((b) => b.id === "accelgor")!;
    const escavalier = boosts.find((b) => b.id === "escavalier")!;
    expect(formatBoostEffect(accelgor, 15)).toBe("+10.0% CDR");
    expect(formatBoostEffect(accelgor, 15)).not.toContain("AS");
    expect(formatBoostEffect(escavalier, 15)).toBe("Basic attacks slow 30%");
  });

  it("describes a boost from inside its level window when the current level is past it", () => {
    const boosts = availableActiveBoosts(find("machamp"), [null, null, null], null);
    const bulk = boosts.find((b) => b.id === "move:Bulk Up")!;
    const sub = boosts.find((b) => b.id === "move:Submission")!;
    expect(formatBoostEffect(bulk, 13)).toBe("+15.0% AS, +15.0% Attack");
    expect(boostLevelGate(bulk, 13)).toBe(" (through Lv 4)");
    expect(formatBoostEffect(sub, 13)).toBe("+40.0% AS, +5.0% Crit Rate");
    expect(boostLevelGate(sub, 13)).toBe(" (through Lv 10)");
  });
});
