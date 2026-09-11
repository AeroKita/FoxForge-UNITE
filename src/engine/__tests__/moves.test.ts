import { describe, it, expect } from "vitest";
import {
  baseMove,
  upgradeOptions,
  resolveFinalMove,
  defaultFinalMoveIds,
  moveIdsFromNames,
  uniteMoves,
  playablePassives,
  passiveChipLabel,
} from "../moves";
import { pokemonList } from "../../data/gameData";

const lucario = pokemonList.find((p) => p.id === "lucario")!;
const urshifu = pokemonList.find((p) => p.id === "urshifu")!;
const noBuilds = pokemonList.find((p) => !p.builds || p.builds.length === 0);

describe("move-selection helpers", () => {
  it("separates base skills from upgrade options per slot", () => {
    const base1 = baseMove(lucario, "move1");
    const ups1 = upgradeOptions(lucario, "move1");
    expect(base1?.isUpgrade).toBeFalsy();
    expect(ups1.length).toBeGreaterThanOrEqual(2);
    expect(ups1.every((m) => m.isUpgrade && m.slot === "move1")).toBe(true);
  });

  it("defaults to the top Recommended build's moves", () => {
    const topBuild = lucario.builds!.find((b) => b.moves && b.moves.length > 0)!;
    const eff1 = resolveFinalMove(lucario, "move1");
    const eff2 = resolveFinalMove(lucario, "move2");
    expect(topBuild.moves).toContain(eff1!.name);
    expect(topBuild.moves).toContain(eff2!.name);
  });

  it("honors an explicit choice over the default", () => {
    const ups1 = upgradeOptions(lucario, "move1");
    const other = ups1.find((m) => m.id !== resolveFinalMove(lucario, "move1")!.id)!;
    expect(resolveFinalMove(lucario, "move1", other.id)!.id).toBe(other.id);
  });

  it("ignores an invalid/foreign chosen id and falls back to the default", () => {
    expect(resolveFinalMove(lucario, "move1", "not-a-real-move")!.id).toBe(
      resolveFinalMove(lucario, "move1")!.id,
    );
  });

  it("resolves a build's move names into per-slot ids", () => {
    const ups1 = upgradeOptions(lucario, "move1");
    const ups2 = upgradeOptions(lucario, "move2");
    const ids = moveIdsFromNames(lucario, [ups1[1].name, ups2[1].name]);
    expect(ids.move1Id).toBe(ups1[1].id);
    expect(ids.move2Id).toBe(ups2[1].id);
  });

  it("returns the primary Ability alone when extraPassives is absent", () => {
    expect(playablePassives(lucario)).toEqual([lucario.passiveAbility]);
  });

  it("appends extraPassives after the primary Ability", () => {
    const extra = {
      id: "drought",
      name: "Drought",
      description: "The sunlight surrounding the Pokémon becomes stronger.",
      effects: [],
      phase: "mega" as const,
    };
    const stub = { ...lucario, extraPassives: [extra] };
    expect(playablePassives(stub).map((a) => a.id)).toEqual([lucario.passiveAbility.id, "drought"]);
  });

  it("labels Mega phases as Pre-Mega / Mega and form pairs by stageLabel", () => {
    expect(passiveChipLabel({ ...lucario.passiveAbility, phase: "preMega" })).toBe("Pre-Mega");
    expect(passiveChipLabel({ ...lucario.passiveAbility, phase: "mega" })).toBe("Mega");
    expect(passiveChipLabel({ ...lucario.passiveAbility, stageLabel: "Pikachu" })).toBe("Pikachu");
    expect(passiveChipLabel(lucario.passiveAbility)).toBeNull();
  });

  it("prefers Mega phase over stageLabel when both are present", () => {
    expect(
      passiveChipLabel({
        ...lucario.passiveAbility,
        phase: "mega",
        stageLabel: "Charizard",
      }),
    ).toBe("Mega");
  });

  it("returns every Unite Move, including dual-unite Pokémon", () => {
    // Single-unite baseline.
    expect(uniteMoves(lucario).length).toBe(1);
    // Urshifu has two Unite Moves gated on his final-move path — both must surface.
    const names = uniteMoves(urshifu).map((m) => m.name);
    expect(names).toContain("Ebon Fist");
    expect(names).toContain("Flowing Fists");
    expect(uniteMoves(urshifu).length).toBe(2);
  });

  it("produces non-null defaults for every Pokémon (incl. those without builds)", () => {
    const d = defaultFinalMoveIds(lucario);
    expect(d.move1Id).toBeTruthy();
    expect(d.move2Id).toBeTruthy();
    if (noBuilds) {
      const dn = defaultFinalMoveIds(noBuilds);
      // First upgrade option (or base) — still resolves to something selectable.
      expect(resolveFinalMove(noBuilds, "move1")).toBeDefined();
      expect(dn.move1Id ?? resolveFinalMove(noBuilds, "move1")?.id).toBeTruthy();
    }
  });
});
