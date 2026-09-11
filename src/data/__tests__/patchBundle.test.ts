import { describe, it, expect } from "vitest";
import { loadBundle } from "../loadBundle";
import { computeEmblemLoadout } from "../../engine/emblems";
import { computeEffectiveStats } from "../../engine/formulas";
import { playablePassives } from "../../engine/moves";
import type { CalcContext } from "../../types";
import raw from "../patch-current.json";
import type { GameDataBundle } from "../../types";

function collectUserFacingTexts(bundle: GameDataBundle): string[] {
  const texts: string[] = [];
  for (const p of bundle.pokemon) {
    for (const m of p.moves) {
      if (m.description) texts.push(`${p.id}/${m.id} description: ${m.description}`);
      if (m.descriptionAdvanced) {
        texts.push(`${p.id}/${m.id} descriptionAdvanced: ${m.descriptionAdvanced}`);
      }
    }
    for (const pa of playablePassives(p)) {
      if (pa.description) texts.push(`${p.id}/${pa.id} description: ${pa.description}`);
      if (pa.descriptionAdvanced) {
        texts.push(`${p.id}/${pa.id} descriptionAdvanced: ${pa.descriptionAdvanced}`);
      }
    }
  }
  for (const item of [...bundle.heldItems, ...(bundle.battleItems ?? [])]) {
    if (item.description) texts.push(`${item.id} description: ${item.description}`);
  }
  return texts;
}

// Guards the live community bundle (UNITE-DB) against schema drift and bad data.
describe("community data bundle", () => {
  const bundle = loadBundle(raw);

  it("zod-validates and has the full roster", () => {
    expect(bundle.pokemon.length).toBeGreaterThanOrEqual(90);
    expect(bundle.heldItems.length).toBeGreaterThanOrEqual(40);
    expect(bundle.emblems.length).toBeGreaterThanOrEqual(250);
    expect(bundle.setBonuses.length).toBeGreaterThanOrEqual(9);
  });

  it("reproduces Lucario Lv15 in-game base stats", () => {
    const l = bundle.pokemon.find((p) => p.id === "lucario")!;
    const s = l.baseStatsByLevel[14];
    expect(s).toMatchObject({ hp: 7249, attack: 429, defense: 390, spAttack: 115, spDefense: 300 });
    expect(s.critRate).toBe(0.2);
    expect(s.attackSpeed).toBe(0.4);
    expect(s.moveSpeed).toBe(4300);
  });

  it("has exact max-level held-item flats at grade 40", () => {
    const fs = bundle.heldItems.find((i) => i.id === "float-stone")!.statsByGrade["40"];
    expect(fs).toMatchObject({ attack: 28, moveSpeed: 175 });
    const mb = bundle.heldItems.find((i) => i.id === "muscle-band")!.statsByGrade["40"];
    expect(mb.attack).toBe(17.5);
    expect(mb.attackSpeed).toBeCloseTo(0.0875, 6);
  });

  it("every pokemon has 15 level rows and a local asset path", () => {
    for (const p of bundle.pokemon) {
      expect(p.baseStatsByLevel).toHaveLength(15);
      expect(p.imageAsset).toMatch(/^\/assets\//);
    }
  });

  it("applies 6-Brown set bonus then item flats in the right order", () => {
    const lucario = bundle.pokemon.find((p) => p.id === "lucario")!;
    const brown = bundle.emblems
      .filter((e) => e.colors.includes("brown"))
      .slice(0, 6)
      .map((emblem) => ({ emblem, grade: "gold" as const }));
    const loadout = computeEmblemLoadout(brown, bundle.setBonuses);
    expect(loadout.activeSetBonuses.find((b) => b.color === "brown")?.bonusPercent).toBe(0.04);
    const ctx: CalcContext = { inCombat: true, goalsScored: 0 };
    const eff = computeEffectiveStats(lucario, 15, loadout, [], [], ctx);
    // attack must be strictly greater than base 429 after the +4% brown bonus
    expect(eff.attack).toBeGreaterThan(429);
  });

  it("6 synthetic Brown flats 16.7 + Float Stone G40 stack to Atk 578", () => {
    const lucario = bundle.pokemon.find((p) => p.id === "lucario")!;
    const sixBrown = computeEmblemLoadout(
      Array.from({ length: 6 }, (_, i) => ({
        emblem: {
          id: `synthetic-${i}`,
          pokemonName: `Synthetic${i}`,
          colors: ["brown" as const],
          iconAsset: "",
          statsByGrade: {
            bronze: { attack: 16.7 },
            silver: { attack: 16.7 },
            gold: { attack: 16.7 },
          },
        },
        grade: "gold" as const,
      })),
      bundle.setBonuses,
    );
    const floatStone = bundle.heldItems.find((i) => i.id === "float-stone")!;
    const ctx: CalcContext = { inCombat: true, goalsScored: 0 };
    const ordered = computeEffectiveStats(lucario, 15, sixBrown, [floatStone], [40], ctx);
    // floor((429 + round(100.2)) * 1.04) + 28 = 578
    // (item-flats-inside-% would give 579; flats-not-multiplied would give 574)
    expect(ordered.attack).toBe(578);
  });

  it("marks UNITE-DB gold-only emblems (no silver/bronze on CDN)", () => {
    const goldOnly = bundle.emblems.filter((e) => e.goldOnly);
    expect(goldOnly.map((e) => e.pokemonName).sort()).toEqual([
      "Floragato",
      "Latias",
      "Latios",
      "Meowscarada",
      "Miraidon",
      "Sprigatito",
    ]);
  });

  it("gives every non-basic move a local skill-icon path", () => {
    for (const p of bundle.pokemon) {
      for (const m of p.moves) {
        if (m.slot === "basicAttack") continue;
        expect(m.iconAsset, `${p.id}/${m.name}`).toMatch(/^\/assets\/skills\//);
      }
    }
  });

  it("carries each curated build's two final moves (resolvable to icons)", () => {
    const lucario = bundle.pokemon.find((p) => p.id === "lucario")!;
    const moveByName = new Map(lucario.moves.map((m) => [m.name, m]));
    const build = lucario.builds!.find((b) => b.name === "Extreme Rush")!;
    expect(build.moves).toEqual(["Extreme Speed", "Bone Rush"]);
    for (const name of build.moves!) {
      expect(moveByName.get(name)?.iconAsset).toMatch(/^\/assets\/skills\//);
    }
  });

  it("every build move name resolves to a move in that Pokémon's catalog", () => {
    for (const p of bundle.pokemon) {
      const names = new Set(p.moves.map((m) => m.name));
      for (const b of [...(p.builds ?? []), ...(p.creativeBuilds ?? [])]) {
        for (const mv of b.moves ?? []) {
          expect(names.has(mv), `${p.id}: build "${b.name}" move "${mv}"`).toBe(true);
        }
      }
    }
  });

  it("held items expose grades 1–40 with correct scaling (Muscle Band)", () => {
    const mb = bundle.heldItems.find((i) => i.id === "muscle-band")!;
    expect(Object.keys(mb.statsByGrade)).toHaveLength(40);
    expect(mb.statsByGrade["30"]?.attack).toBe(15);
    expect(mb.statsByGrade["40"]?.attack).toBe(17.5);
    expect(mb.statsByGrade["40"]?.attackSpeed).toBeCloseTo(0.0875, 6);
  });

  it("carries structured grade 1/10/20 effect tiers from the source", () => {
    const mb = bundle.heldItems.find((i) => i.id === "muscle-band")!;
    expect(mb.effect).toEqual({ label: "Remaining HP", tiers: ["1%", "2%", "3%"] });
    const dc = bundle.heldItems.find((i) => i.id === "drain-crown")!;
    expect(dc.effect).toEqual({ label: "Lifesteal", tiers: ["9%", "12%", "15%"] });
  });

  describe("Basic/Advanced move descriptions", () => {
    it("Talonflame Fly upgrade has tiered descriptions", () => {
      const talonflame = bundle.pokemon.find((p) => p.id === "talonflame")!;
      const fly = talonflame.moves.find((m) => m.id === "fly")!;
      expect(fly.descriptionAdvanced).toContain("flies up into the sky for up to 3s");
      expect(fly.descriptionAdvanced).toContain(
        "Upgrade (Level 13): Throws opposing Pokémon hit for 0.4s",
      );
      expect(fly.description).toContain(
        "Upgrade (Level 13): Also throws opposing Pokémon when this move hits.",
      );
      expect(fly.description).not.toContain("0.4s");
    });

    it("Lucario Extreme Speed Basic keeps its archive body and Upgrade", () => {
      const lucario = bundle.pokemon.find((p) => p.id === "lucario")!;
      const extreme = lucario.moves.find((m) => m.id === "extreme-speed")!;
      expect(extreme.description).toContain("breathtaking speed");
      expect(extreme.description).toContain("Extreme Speed mark");
      expect(extreme.description).toContain("\n\nAfter the user learns");
      expect(extreme.description).toContain(
        "Upgrade (Level 11): Also increases Attack for a short time when this move is used.",
      );
      expect(extreme.description).not.toContain("7.5%");
      expect(extreme.descriptionAdvanced).toContain("7.5%");
      expect(extreme.description).not.toContain("point-blank range");
    });

    it("Lucario shows operator in-game Basic for Steadfast and all moves", () => {
      // Distinctive in-game phrases from the 2026-09-10 Lucario transcript.
      // Attack / basicAttack is out of scope.
      const lucario = bundle.pokemon.find((p) => p.id === "lucario")!;
      const byId = Object.fromEntries(lucario.moves.map((m) => [m.id, m]));

      expect(lucario.passiveAbility.id).toBe("steadfast");
      expect(lucario.passiveAbility.name).toBe("Steadfast");
      expect(lucario.passiveAbility.description).toContain(
        "When the Pokémon is at low HP, it is granted a shield",
      );
      expect(lucario.passiveAbility.description).not.toContain("30s cooldown");
      expect(lucario.passiveAbility.description).not.toContain("While at low HP, gain a shield");

      expect(byId["quick-attack"].description).toContain("almost invisible");
      expect(byId["meteor-mash"].description).toContain("punch like a comet");

      expect(byId["extreme-speed"].description).toContain("\n\nThis mark cannot stack");
      expect(byId["extreme-speed"].description).toContain(
        "Upgrade (Level 11): Also increases Attack for a short time when this move is used.",
      );

      expect(byId["power-up-punch"].description).toContain(
        "its movement speed is decreased but its Attack slowly increases and the damage",
      );
      expect(byId["power-up-punch"].description).not.toContain("decreased, but");
      expect(byId["power-up-punch"].description).not.toContain("When the user Mega Evolves");
      expect(byId["power-up-punch"].description).toContain(
        "Upgrade (Level 11): The user becomes immune to hindrances while charging power.",
      );
      expect(byId["power-up-punch"].description).not.toContain(
        "Become immune to hindrances while charging power.",
      );

      expect(byId["bone-rush"].description).toContain("applying an Extreme Speed mark");
      expect(byId["bone-rush"].description).toContain(
        "Upgrade (Level 13): Using this move again will reset the cooldown for Extreme Speed or Power-Up Punch.",
      );

      expect(byId["close-combat"].description).toContain(
        "Upgrade (Level 13): Increases damage dealt by this move.",
      );
      expect(byId["close-combat"].description).not.toContain("Increased damage.");

      expect(byId["aura-cannon"].description).toContain(
        "\n\nOpposing Pokémon damaged by this Unite Move",
      );
      expect(byId["aura-cannon"].description).toContain(
        "\n\nAfter using this Unite Move, the user's next Power-Up Punch deals increased damage.",
      );
      expect(byId["aura-cannon"].description).not.toContain("users's");
    });

    it("Venusaur shows operator in-game Basic for Overgrow and all moves", () => {
      // Distinctive in-game phrases from the 2026-09-10 Venusaur transcript.
      // Attack / basicAttack is out of scope.
      const venusaur = bundle.pokemon.find((p) => p.id === "venusaur")!;
      const byId = Object.fromEntries(venusaur.moves.map((m) => [m.id, m]));

      expect(venusaur.passiveAbility.id).toBe("overgrow");
      expect(venusaur.passiveAbility.name).toBe("Overgrow");
      expect(venusaur.passiveAbility.description).toContain(
        "When the Pokémon is at low HP, the damage it deals is increased.",
      );

      expect(byId["seed-bomb"].description).toContain("Hurls a large seed");

      expect(byId["sludge-bomb"].description).toContain(
        "Upgrade (Level 11): Increases this move's area of effect.",
      );
      expect(byId["sludge-bomb"].description).not.toContain("Increased area of effect.");

      expect(byId["giga-drain"].description).toContain(
        "Also reduces the damage the user receives for a short time.",
      );
      expect(byId["giga-drain"].description).toContain(
        "Upgrade (Level 11): Increases the amount of HP this move restores.",
      );
      expect(byId["giga-drain"].description).not.toContain("Increases amount of HP restored.");

      expect(byId["razor-leaf"].description).toContain("sharp-edged leaves");

      expect(byId["solar-beam"].description).toContain("Blasts a bundled beam of light");
      expect(byId["solar-beam"].description).toContain(
        "Upgrade (Level 13): Reduces this move's cooldown.",
      );
      expect(byId["solar-beam"].description).not.toContain("Blasta");
      expect(byId["solar-beam"].description).not.toContain("Reduced cooldown.");

      expect(byId["petal-dance"].description).toContain(
        "If this move hits Pokémon on the opposing team, the cooldown of Giga Drain or Sludge Bomb is reduced.",
      );
      expect(byId["petal-dance"].description).toContain(
        "Upgrade (Level 13): Increases this move's area of effect.",
      );
      expect(byId["petal-dance"].description).not.toContain("this moves area");

      expect(byId["verdant-anger"].description).toContain("Launches a giant seed");
    });

    it("Charizard shows operator in-game Basic for Blaze and all moves", () => {
      const charizard = bundle.pokemon.find((p) => p.id === "charizard")!;
      const byId = Object.fromEntries(charizard.moves.map((m) => [m.id, m]));
      expect(charizard.passiveAbility.description).toContain(
        "When the Pokémon is at half HP or less, its critical-hit rate is increased.",
      );
      expect(byId["flame-burst"].description).toMatch(/^Attacks with a bursting flame/);
      expect(byId["flamethrower"].description).toMatch(/^Attacks with an intense blast of fire/);
      expect(byId["flamethrower"].description).toContain(
        "Upgrade (Level 11): Increases this move's damage and the damage caused by burning.",
      );
      expect(byId["fire-punch"].description).toContain("punch with a fiery fist");
      expect(byId["fire-blast"].description).toContain(
        "Upgrade (Level 13): Increases damage dealt by this move.",
      );
      expect(byId["flare-blitz"].description).toContain("charge forward cloaked in fire");
      expect(byId["seismic-slam"].description).toContain(
        "when the user deals damage to an opposing Pokémon, the user recovers HP.",
      );
      expect(byId["seismic-slam"].description).not.toContain("deals damaged");
    });

    it("Mega Charizard X shows operator in-game Basic including Solar Power and Fire Punch", () => {
      const x = bundle.pokemon.find((p) => p.id === "mega-charizard-x")!;
      const byId = Object.fromEntries(x.moves.map((m) => [m.id, m]));
      const pre = playablePassives(x).find((a) => a.phase === "preMega")!;
      const mega = playablePassives(x).find((a) => a.phase === "mega")!;
      expect(pre.name).toBe("Solar Power");
      expect(pre.description).toContain("loses some HP");
      expect(pre.description).toContain("This Ability's effect does not trigger");
      expect(pre.description).not.toContain("5% of its current HP");
      expect(mega.name).toBe("Tough Claws");
      expect(mega.description).toContain("maximum 3 counters");
      expect(byId["fire-punch"].description).toContain("punch with a fiery fist");
      expect(byId["fire-punch"].description).toContain(
        "When the user has Mega Evolved, all Pokémon it hits are burned.",
      );
      expect(byId["fire-punch"].description).not.toContain("intense blast of fire");
      expect(byId["fire-spin"].description).toContain("area of effect");
      expect(byId["fire-spin"].description).not.toContain("area of affect");
      expect(byId["flare-blitz"].description).toContain("this move's cooldown");
      expect(byId["flare-blitz"].description).not.toContain("moves's");
      expect(byId["seismic-slam"].description).toContain(
        "After using this Unite Move, the user Mega Evolves.",
      );
    });

    it("Mega Charizard Y shows operator in-game Basic including Pre-Mega Blaze", () => {
      const y = bundle.pokemon.find((p) => p.id === "mega-charizard-y")!;
      const byId = Object.fromEntries(y.moves.map((m) => [m.id, m]));
      const pre = playablePassives(y).find((a) => a.phase === "preMega")!;
      expect(pre.name).toBe("Blaze");
      expect(pre.description).toContain(
        "When the Pokémon receives damage, it deals increased damage for a short time.",
      );
      expect(pre.description).not.toContain("Increases Attack by 8%");
      expect(byId["flamethrower"].description).toContain(
        "When the user Mega Evolves, its movement speed is further increased.",
      );
      expect(byId["flamethrower"].description).toContain(
        "Upgrade (Level 11): Increases this move's damage and the damage caused by burning.",
      );
      expect(byId["fire-spin"].description).not.toContain("area of affect");
      expect(byId["fire-blast"].description).toContain(
        "When the user Mega Evolves, this move's area of effect is increased.",
      );
      expect(byId["seismic-slam"].description).toContain("its basic attacks deal increased damage");
      expect(byId["seismic-slam"].description).not.toContain("basic attack deal");
    });

    it("Mega Lucario shows operator in-game Basic including Justified", () => {
      const lucario = bundle.pokemon.find((p) => p.id === "mega-lucario")!;
      const byId = Object.fromEntries(lucario.moves.map((m) => [m.id, m]));
      const pre = playablePassives(lucario).find((a) => a.phase === "preMega")!;
      const mega = playablePassives(lucario).find((a) => a.phase === "mega")!;
      expect(pre.name).toBe("Justified");
      expect(pre.description).toContain("This effect can stack up to 4 times.");
      expect(pre.description).not.toContain("8% for 4s");
      expect(mega.name).toBe("Adaptability");
      expect(byId["power-up-punch"].description).toContain(
        "its movement speed is decreased but its Attack slowly increases and the damage",
      );
      expect(byId["power-up-punch"].description).not.toContain("decreased, but");
      expect(byId["power-up-punch"].description).toContain(
        "When the user Mega Evolves, it can charge power for a longer duration and it throws opposing Pokémon.",
      );
      expect(byId["power-up-punch"].description).toContain(
        "Upgrade (Level 11): The user becomes immune to hindrances while charging power.",
      );
      expect(byId["close-combat"].description).toContain(
        "the user's moves hit Pokémon from the opposing team.",
      );
      expect(byId["aura-cannon"].description).toContain(
        "\n\nAfter using this Unite Move, the user Mega Evolves.",
      );
      expect(byId["aura-cannon"].description).not.toContain("Pokmon");
    });

    it("Talonflame Gale Wings passive has Advanced text", () => {
      const talonflame = bundle.pokemon.find((p) => p.id === "talonflame")!;
      expect(talonflame.passiveAbility.descriptionAdvanced).toContain("85% max HP");
    });

    it("Tyranitar shows Guts, Shed Skin, and Sand Stream as a three-stage form pair", () => {
      const tyranitar = bundle.pokemon.find((p) => p.id === "tyranitar")!;
      const passives = playablePassives(tyranitar);
      expect(passives.map((a) => a.name)).toEqual(["Guts", "Shed Skin", "Sand Stream"]);
      expect(passives.map((a) => a.stageLabel)).toEqual(["Larvitar", "Pupitar", "Tyranitar"]);
      expect(passives.every((a) => a.phase === undefined)).toBe(true);
      expect(passives[0].description).toContain("its Attack increases");
      expect(passives[1].description).toContain("status conditions are nullified");
      expect(passives[2].description).toContain("sandstorm");
      expect(passives[2].description).toContain("Unite Move");
      expect(passives[2].iconAsset).toContain("Sand+Stream");
      expect(passives[2].description).not.toContain("Larvitar");
      expect(passives[2].description).not.toContain("10%");
    });

    it("evolution licenses show pre-evolution Passives as form pairs", () => {
      const cases = [
        {
          id: "aegislash",
          stages: [
            { name: "No Guard", label: "Honedge", needle: "Increases received damage" },
            { name: "Stance Change", label: "Aegislash", needle: "Blade Forme" },
          ],
        },
        {
          id: "ceruledge",
          stages: [
            {
              name: "Flame Body",
              label: "Charcadet",
              needle: "deals damage around itself with flames",
            },
            { name: "Weak Armor", label: "Ceruledge", needle: "receive a wound" },
          ],
        },
        {
          id: "dragonite",
          stages: [
            { name: "Marvel Scale", label: "Dragonair", needle: "afflicted by a status condition" },
            {
              name: "Multiscale",
              label: "Dragonite",
              needle: "Reduces the damage the Pokémon receives",
            },
          ],
        },
        {
          id: "espeon",
          stages: [
            { name: "Anticipation", label: "Eevee", needle: "hindrance is negated" },
            { name: "Magic Bounce", label: "Espeon", needle: "immune to hindrances" },
          ],
        },
        {
          id: "glaceon",
          stages: [
            { name: "Run Away", label: "Eevee", needle: "becomes invincible" },
            { name: "Snow Cloak", label: "Glaceon", needle: "enters stealth" },
          ],
        },
        {
          id: "gyarados",
          stages: [
            { name: "Rattled", label: "Magikarp", needle: "effort gauge" },
            { name: "Moxie", label: "Gyarados", needle: "all of its move cooldowns are reduced" },
          ],
        },
        {
          id: "leafeon",
          stages: [
            { name: "Run Away", label: "Eevee", needle: "not in combat" },
            { name: "Chlorophyll", label: "Leafeon", needle: "Chlorophyll gauge" },
          ],
        },
        {
          id: "solgaleo",
          stages: [
            { name: "Unaware", label: "Cosmog", needle: "Attack and Sp. Atk is ignored" },
            { name: "Sturdy", label: "Cosmoem", needle: "1 HP will remain" },
            { name: "Full Metal Body", label: "Solgaleo", needle: "Attack does not decrease" },
          ],
        },
        {
          id: "tsareena",
          stages: [
            { name: "Oblivious", label: "Bounsweet", needle: "duration of hindrance effects" },
            { name: "Queenly Majesty", label: "Tsareena", needle: "Queenly Majesty buff" },
          ],
        },
        {
          id: "umbreon",
          stages: [
            {
              name: "Anticipation",
              label: "Eevee",
              needle: "shoved, thrown, or left unable to act",
            },
            { name: "Inner Focus", label: "Umbreon", needle: "Defense and Sp. Def are increased" },
          ],
        },
        {
          id: "urshifu",
          stages: [
            { name: "Inner Focus", label: "Kubfu", needle: "duration of hindrance effects" },
            { name: "Unseen Fist", label: "Urshifu", needle: "pierces part of the shield" },
          ],
        },
        {
          id: "vaporeon",
          stages: [
            { name: "Run Away", label: "Eevee", needle: "nullifies damage" },
            { name: "Water Absorb", label: "Vaporeon", needle: "water shield" },
          ],
        },
      ] as const;
      for (const c of cases) {
        const p = bundle.pokemon.find((mon) => mon.id === c.id)!;
        const passives = playablePassives(p);
        expect(passives, c.id).toHaveLength(c.stages.length);
        expect(p.extraPassives, c.id).toHaveLength(c.stages.length - 1);
        for (const [i, stage] of c.stages.entries()) {
          expect(passives[i].name, `${c.id}/${stage.name}`).toBe(stage.name);
          expect(passives[i].stageLabel, `${c.id}/${stage.name}`).toBe(stage.label);
          expect(passives[i].phase, `${c.id}/${stage.name}`).toBeUndefined();
          expect(passives[i].description, `${c.id}/${stage.name}`).toContain(stage.needle);
          expect(passives[i].description, `${c.id}/${stage.name}`).not.toContain(stage.label);
        }
      }
    });

    it("playable Ability Basic does not keep pre-evolution species names in the body", () => {
      const cases = [
        {
          id: "aegislash",
          name: "Stance Change",
          file: "Stance+Change",
          needle: "Blade Forme",
          not: "Honedge",
        },
        {
          id: "ceruledge",
          name: "Weak Armor",
          file: "Weak+Armor",
          needle: "receive a wound",
          not: "Charcadet",
        },
        {
          id: "dragonite",
          name: "Multiscale",
          file: "Multiscale",
          needle: "Reduces the damage the Pokémon receives",
          not: "Dratini",
        },
        {
          id: "espeon",
          name: "Magic Bounce",
          file: "Magic+Bounce",
          needle: "immune to hindrances",
          not: "Eevee",
        },
        {
          id: "glaceon",
          name: "Snow Cloak",
          file: "Snow+Cloak",
          needle: "enters stealth",
          not: "Eevee",
        },
        {
          id: "gyarados",
          name: "Moxie",
          file: "Moxie",
          needle: "all of its move cooldowns are reduced",
          not: "Rattled",
        },
        {
          id: "leafeon",
          name: "Chlorophyll",
          file: "Chlorophyll",
          needle: "Chlorophyll gauge",
          not: "Eevee",
        },
        {
          id: "tsareena",
          name: "Queenly Majesty",
          file: "Queenly+Majesty",
          needle: "Queenly Majesty buff",
          not: "Bounsweet",
        },
        {
          id: "umbreon",
          name: "Inner Focus",
          file: "Inner+Focus",
          needle: "shoved, thrown, or left unable to act",
          not: "Eevee",
        },
        {
          id: "urshifu",
          name: "Unseen Fist",
          file: "Unseen+Fist",
          needle: "pierces part of the shield",
          not: "Kubfu",
        },
        {
          id: "vaporeon",
          name: "Water Absorb",
          file: "Water+Absorb",
          needle: "water shield",
          not: "30s cooldown",
        },
      ] as const;
      for (const c of cases) {
        const p = bundle.pokemon.find((mon) => mon.id === c.id)!;
        const ability = playablePassives(p).find((a) => a.name === c.name);
        expect(ability, c.id).toBeDefined();
        expect(ability!.iconAsset, c.id).toContain(c.file);
        expect(ability!.description, c.id).toContain(c.needle);
        expect(ability!.description, c.id).not.toContain(c.not);
      }
      const mew = bundle.pokemon.find((p) => p.id === "mew")!;
      expect(mew.passiveAbility.name).toBe("Synchronize");
      expect(mew.passiveAbility.id).toBe("synchronize");
      expect(mew.passiveAbility.description).toContain("movement speed");
      expect(mew.passiveAbility.description).toContain("Move Reset");
    });

    it("Alolan Raichu, Alolan Ninetales, and Galarian Rapidash use form-qualified names", () => {
      const raichu = bundle.pokemon.find((p) => p.id === "alolan-raichu")!;
      const ninetales = bundle.pokemon.find((p) => p.id === "alolan-ninetales")!;
      const rapidash = bundle.pokemon.find((p) => p.id === "galarian-rapidash")!;
      expect(raichu.displayName).toBe("Alolan Raichu");
      expect(ninetales.displayName).toBe("Alolan Ninetales");
      expect(rapidash.displayName).toBe("Galarian Rapidash");
      expect(bundle.pokemon.find((p) => p.id === "raichu")).toBeUndefined();
      expect(bundle.pokemon.find((p) => p.id === "ninetales")).toBeUndefined();
      expect(bundle.pokemon.find((p) => p.id === "rapidash")).toBeUndefined();
    });

    it("Sylveon shows Adaptability and Pixilate as a form pair plus in-game Basic move text", () => {
      const sylveon = bundle.pokemon.find((p) => p.id === "sylveon")!;
      const byId = Object.fromEntries(sylveon.moves.map((m) => [m.id, m]));
      const passives = playablePassives(sylveon);

      expect(passives).toHaveLength(2);
      expect(passives[0].name).toBe("Adaptability");
      expect(passives[0].stageLabel).toBe("Eevee");
      expect(passives[0].phase).toBeUndefined();
      expect(passives[0].iconAsset).toContain("Adaptability");
      expect(passives[0].description).toContain("its Sp. Atk is increased for a short time");
      expect(passives[0].description).not.toContain("Eevee");
      expect(passives[0].description).not.toContain("5%");
      expect(passives[1].name).toBe("Pixilate");
      expect(passives[1].stageLabel).toBe("Sylveon");
      expect(passives[1].phase).toBeUndefined();
      expect(passives[1].iconAsset).toContain("Pixilate");
      expect(passives[1].description).toContain("Sp. Atk and Sp. Def");
      expect(passives[1].descriptionAdvanced).toContain("5%");
      expect(passives[1].descriptionAdvanced).toContain("1.5s");

      expect(byId.swift.description).toContain("opposing Pokémon");
      expect(byId.swift.description).not.toContain("4 star-shaped");

      expect(byId["hyper-voice"].description).toContain("sound waves");
      expect(byId["hyper-voice"].description).toContain(
        "Upgrade (Level 10): Applies a slowing effect to opposing Pokémon hit by this move.",
      );
      expect(byId["hyper-voice"].descriptionAdvanced).toContain("slowed by 30%");
      expect(byId["hyper-voice"].description).not.toContain("slowed by 30%");

      expect(byId["draining-kiss"].description).toContain("Has the user blow a kiss");
      expect(byId["draining-kiss"].description).toContain(
        "Upgrade (Level 12): Increases the amount of HP this move restores.",
      );
      expect(byId["draining-kiss"].description).not.toContain("Increased healing.");

      expect(byId["calm-mind"].description).toContain("Has the user quietly focus");
      expect(byId["calm-mind"].description).toContain(
        "the damage is completely nullified and the user is granted a shield",
      );
      expect(byId["calm-mind"].description).toContain(
        "Upgrade (Level 12): One time only while using this move, if the user is hit by an opposing Pokémon's move, the damage is completely nullified and the user is granted a shield.",
      );
      expect(byId["calm-mind"].description).not.toContain("nullified, and");
      expect(byId["calm-mind"].description).not.toContain("40%");

      expect(byId["baby-doll-eyes"].description).toContain("Has the user stare");

      expect(byId["fairy-frolic"].description).toContain("a set percentage");
      expect(byId["fairy-frolic"].description).not.toContain("50%");
      expect(byId["fairy-frolic"].description).not.toContain("10s");

      expect(byId["mystical-fire"].description).toMatch(/^Has the user create four small flames/);
      expect(byId["mystical-fire"].description).toContain(
        "Upgrade (Level 10): Increases the number of flames by one.",
      );
    });

    it("Urshifu Ebon Fist uses the stitched in-game Unite tooltip", () => {
      const urshifu = bundle.pokemon.find((p) => p.id === "urshifu")!;
      const ebon = urshifu.moves.find((m) => m.id === "ebon-fist")!;
      expect(ebon.slot).toBe("uniteMove");
      expect(ebon.description).toContain("Has the user dash at the designated opposing Pokémon");
      expect(ebon.description).toContain("shoves it in that direction");
      expect(ebon.description).toContain("reset Wicked Blow's cooldown");
      expect(ebon.description).not.toContain("debuff effects");
    });

    it("Alolan Raichu shows Static and Surge Surfer as a form pair plus in-game Basic", () => {
      const raichu = bundle.pokemon.find((p) => p.id === "alolan-raichu")!;
      const byId = Object.fromEntries(raichu.moves.map((m) => [m.id, m]));
      const passives = playablePassives(raichu);

      expect(passives).toHaveLength(2);
      expect(passives[0].name).toBe("Static");
      expect(passives[0].stageLabel).toBe("Pikachu");
      expect(passives[0].phase).toBeUndefined();
      expect(passives[0].iconAsset).toContain("Static");
      expect(passives[0].description).toContain(
        "Paralyzes all opponents near the Pokémon for a short time",
      );
      expect(passives[0].description).not.toContain("30s");
      expect(passives[1].name).toBe("Surge Surfer");
      expect(passives[1].stageLabel).toBe("Raichu");
      expect(passives[1].phase).toBeUndefined();
      expect(passives[1].iconAsset).toContain("Surge+Surfer");
      expect(passives[1].description).toContain("while moving");

      expect(byId["thunder-shock"].description).toContain(
        "Releases electricity at the designated opposing Pokémon",
      );
      expect(byId["stored-power"].description).toContain(
        "Upgrade (Level 11): The electric blasts decrease opposing Pokémon's Sp. Def. This effect can stack up to 3 times.",
      );
      expect(byId["stored-power"].description).not.toContain("8%");
      expect(byId["electro-ball"].description).toContain(
        "A maximum of 2 uses can be kept in reserve",
      );
      expect(byId["electro-ball"].description).toContain(
        "Upgrade (Level 11): Deals damage over time to opposing Pokémon hit by this move.",
      );
      expect(byId["electro-ball"].description).not.toContain("0.5s");
      expect(byId["thunderbolt"].description).toContain(
        "Upgrade (Level 13): Leaves opposing Pokémon unable to move instead of paralyzed.",
      );
      expect(byId["thunderbolt"].description).not.toContain("Immobilizes");
      expect(byId["psychic"].description).toContain(
        "Upgrade (Level 13): Deals damage over time in the designated area for a short time.",
      );
      expect(byId["thunderstorm-aerial"].description).toContain("star-shaped zone of electricity");
    });

    it("Pikachu shows operator in-game Basic for Static and all moves", () => {
      const pikachu = bundle.pokemon.find((p) => p.id === "pikachu")!;
      const byId = Object.fromEntries(pikachu.moves.map((m) => [m.id, m]));
      expect(playablePassives(pikachu)).toHaveLength(1);
      expect(pikachu.passiveAbility.stageLabel).toBeUndefined();
      expect(pikachu.passiveAbility.description).toContain(
        "Paralyzes all opponents near the Pokémon for a short time",
      );
      expect(pikachu.passiveAbility.description).not.toContain("enemies nearby");
      expect(byId["thunder-shock"].description).toContain("Releases electricity, dealing damage");
      expect(byId["thunder-shock"].description).not.toContain("Fires electricity");
      expect(byId["electro-ball"].description).toContain(
        "Upgrade (Level 11): Increases damage dealt by this move.",
      );
      expect(byId.thunder.description).toContain(
        "Upgrade (Level 11): Increases the number of attacks for this move.",
      );
      expect(byId.electroweb.description).toContain("electric net");
      expect(byId["volt-tackle"].description).toContain(
        "Upgrade (Level 13): Reduces this move's cooldown.",
      );
      expect(byId.thunderbolt.description).toContain(
        "Upgrade (Level 13): Increases damage dealt by this move.",
      );
      expect(byId.thunderstorm.description).toContain(
        "Attacks Pokémon from the opposing team near the user",
      );
    });

    it("Blastoise shows operator in-game Basic for Torrent and all moves", () => {
      const blastoise = bundle.pokemon.find((p) => p.id === "blastoise")!;
      const byId = Object.fromEntries(blastoise.moves.map((m) => [m.id, m]));
      expect(playablePassives(blastoise)).toHaveLength(1);
      expect(blastoise.passiveAbility.description).toContain(
        "When the Pokémon is at half HP or less, its Attack and Sp. Atk are increased.",
      );
      expect(byId["water-gun"].description).toContain("Attacks with a shot of water");
      expect(byId["hydro-pump"].description).toContain(
        "Upgrade (Level 11): Increases damage dealt by this move.",
      );
      expect(byId["water-spout"].description).toContain(
        "Upgrade (Level 11): Increases damage dealt by this move.",
      );
      expect(byId["skull-bash"].description).toContain("Fiercely rams");
      expect(byId.surf.description).toContain("is granted a shield effect when it hits");
      expect(byId.surf.description).toContain(
        "Upgrade (Level 13): Strengthens the effect of the shield granted by this move.",
      );
      expect(byId.surf.description).not.toContain("Also grants a shield");
      expect(byId["rapid-spin"].description).toContain("the user becomes resistant to hindrances");
      expect(byId["rapid-spin"].description).not.toContain("becomes immune to hindrances");
      expect(byId["rapid-spin"].description).toContain(
        "Upgrade (Level 13): Also increases the user's Defense and Sp. Def while using this move.",
      );
      expect(byId["hydro-typhoon"].description).toContain(
        "throwing opposing Pokémon in a large area",
      );
    });

    it("Clefable shows operator in-game Basic for Magic Guard and all moves", () => {
      const clefable = bundle.pokemon.find((p) => p.id === "clefable")!;
      const byId = Object.fromEntries(clefable.moves.map((m) => [m.id, m]));
      expect(playablePassives(clefable)).toHaveLength(1);
      expect(clefable.passiveAbility.description).toContain(
        "The Pokémon receives a shield effect when it restores ally Pokémon's HP.",
      );
      expect(clefable.passiveAbility.description).not.toContain(
        "This Pokémon receives a shield when restoring",
      );
      expect(byId["heal-pulse"].description).toContain("immediately restore HP");
      expect(byId.moonlight.description).toContain(
        "Upgrade (Level 10): Widens this move's area of effect and increases the duration of its effects.",
      );
      expect(byId["draining-kiss"].description).toContain("releases a heart");
      expect(byId["draining-kiss"].description).not.toContain("air kiss");
      expect(byId["draining-kiss"].description).toContain(
        "Upgrade (Level 10): Widens this move's area of effect and increases the amount of HP it restores.",
      );
      expect(byId["disarming-voice"].description).toContain("charming cry");
      expect(byId.gravity.description).toContain("their moves have no movement effect");
      expect(byId.gravity.description).toContain(
        "Upgrade (Level 12): Widens the zone's area of effect and increases the duration of its effects.",
      );
      expect(byId["follow-me"].description).toContain(
        "Upgrade (Level 12): Increases the user's Defense and Sp. Def when this move is used.",
      );
      expect(byId["follow-me"].description).not.toContain("Defense by 150");
      expect(byId["wonder-wish"].description).toContain("waggle its finger");
    });

    it("Alolan Ninetales shows operator in-game Basic for Snow Warning and all moves", () => {
      const ninetales = bundle.pokemon.find((p) => p.id === "alolan-ninetales")!;
      const byId = Object.fromEntries(ninetales.moves.map((m) => [m.id, m]));
      expect(playablePassives(ninetales)).toHaveLength(1);
      expect(ninetales.passiveAbility.stageLabel).toBeUndefined();
      expect(ninetales.passiveAbility.description).toContain(
        "Causes snow to fall on an opposing Pokémon",
      );
      expect(ninetales.passiveAbility.description).not.toContain("30%");
      expect(byId["powder-snow"].description).toContain("chilly gust of powdery snow");
      expect(byId.avalanche.description).toContain(
        "Upgrade (Level 11): Also decreases the movement speed of opposing Pokémon for a short time when this move hits.",
      );
      expect(byId.avalanche.description).not.toContain("enemies");
      expect(byId["dazzling-gleam"].description).toContain(
        "Upgrade (Level 11): Increases damage dealt and the length of time opposing Pokémon are unable to act.",
      );
      expect(byId["icy-wind"].description).toContain(
        "Also shoves opposing Pokémon that are especially close to the user.",
      );
      expect(byId["icy-wind"].description).not.toContain("Breathes wind");
      expect(byId.blizzard.description).toContain(
        "Upgrade (Level 13): Increases damage dealt by this move.",
      );
      expect(byId["aurora-veil"].description).toContain("with increased attack speed");
      expect(byId["aurora-veil"].description).toContain("inside the aurora");
      expect(byId["aurora-veil"].description).not.toContain("insde");
      expect(byId["aurora-veil"].description).toContain(
        "Upgrade (Level 13): Reduces this move's cooldown and further reduces damage ally Pokémon receive.",
      );
      expect(byId["snow-globe"].description).toContain(
        "Deals increased damage to opposing Pokémon that are frozen.",
      );
    });

    it("mega licenses show a Pre-Mega and Mega Ability pair", () => {
      const cases = [
        {
          id: "mega-charizard-x",
          pre: "Solar Power",
          mega: "Tough Claws",
          megaFile: "Tough+Claws",
        },
        { id: "mega-charizard-y", pre: "Blaze", mega: "Drought", megaFile: "Drought" },
        { id: "mega-lucario", pre: "Justified", mega: "Adaptability", megaFile: "Adaptability" },
      ] as const;
      for (const c of cases) {
        const p = bundle.pokemon.find((mon) => mon.id === c.id)!;
        const passives = playablePassives(p);
        expect(passives).toHaveLength(2);
        expect(p.extraPassives).toHaveLength(1);
        expect(passives[0].name).toBe(c.pre);
        expect(passives[0].phase).toBe("preMega");
        expect(passives[1].name).toBe(c.mega);
        expect(passives[1].phase).toBe("mega");
        expect(passives[1].iconAsset).toContain(c.megaFile);
        expect(passives.map((a) => a.name)).not.toContain("Swift Swim");
      }
      const megaGyarados = bundle.pokemon.find((mon) => mon.id === "mega-gyarados")!;
      const gyaradosPassives = playablePassives(megaGyarados);
      expect(gyaradosPassives.map((a) => a.name)).toEqual([
        "Swift Swim",
        "Intimidate",
        "Mold Breaker",
      ]);
      expect(gyaradosPassives[0].stageLabel).toBe("Magikarp");
      expect(gyaradosPassives[0].phase).toBeUndefined();
      expect(gyaradosPassives[1].phase).toBe("preMega");
      expect(gyaradosPassives[2].phase).toBe("mega");
      expect(gyaradosPassives[2].iconAsset).toContain("Mold+Breaker");
      const megaBasics = [
        {
          id: "mega-charizard-x",
          needle: "maximum 3 counters",
          also: "becomes a boosted attack",
        },
        { id: "mega-charizard-y", needle: "sunny area of effect" },
        { id: "mega-lucario", needle: "stack up to 10 times" },
        { id: "mega-gyarados", needle: "ignores some of the opposing Pokémon" },
      ] as const;
      for (const c of megaBasics) {
        const p = bundle.pokemon.find((mon) => mon.id === c.id)!;
        const mega = playablePassives(p).find((a) => a.phase === "mega")!;
        expect(mega.description).toContain(c.needle);
        if ("also" in c) expect(mega.description).toContain(c.also);
      }
      for (const id of ["mewtwox", "mewtwoy", "lucario"] as const) {
        const p = bundle.pokemon.find((mon) => mon.id === id)!;
        expect(playablePassives(p)).toHaveLength(1);
        expect(p.extraPassives ?? []).toHaveLength(0);
      }
    });

    it("no real move or passive ships an upgrade-only description body", () => {
      const upgradeOnly = /^Upgrade(?:\s*\([^)]*\))?:/i;
      const body = (text: string | undefined) =>
        (text ?? "")
          .split("\n\n")
          .map((para) => para.trim())
          .filter((para) => para && !upgradeOnly.test(para))
          .join("\n\n");
      for (const p of bundle.pokemon) {
        for (const m of p.moves) {
          if (m.slot === "basicAttack") continue;
          expect(body(m.description).length, `${p.id}/${m.name} Basic`).toBeGreaterThan(0);
          if (m.descriptionAdvanced) {
            expect(
              body(m.descriptionAdvanced).length,
              `${p.id}/${m.name} Advanced`,
            ).toBeGreaterThan(0);
          }
        }
        for (const pa of playablePassives(p)) {
          expect(body(pa.description).length, `${p.id}/${pa.id} Basic`).toBeGreaterThan(0);
          if (pa.descriptionAdvanced) {
            expect(
              body(pa.descriptionAdvanced).length,
              `${p.id}/${pa.id} Advanced`,
            ).toBeGreaterThan(0);
          }
        }
      }
    });

    it("every real move and passive has a non-blank Basic description", () => {
      for (const p of bundle.pokemon) {
        for (const m of p.moves) {
          if (m.slot === "basicAttack") continue;
          expect((m.description ?? "").trim().length, `${p.id}/${m.name}`).toBeGreaterThan(0);
        }
        for (const pa of playablePassives(p)) {
          expect((pa.description ?? "").trim().length, `${p.id}/${pa.id}`).toBeGreaterThan(0);
        }
      }
    });

    it("does not ship known UNITE-DB prose misspellings or broken sentences", () => {
      const banned = [
        "movemenr",
        "oppposing",
        "intial",
        "deacrease",
        "damge",
        "attakck",
        "nulliffied",
        "Thundershock",
        "shadoww",
        "isnide",
        "speeed",
        "hitos",
        "pases",
        "can the be",
        "the project deals",
        "damage-over time",
        "5s This field",
        "0.6s,  There",
        "0.6s, There",
        "uanble",
        "othr",
        "guage",
        "gauage",
        "disatance",
        "oppsing",
        "blasing",
        "Blass",
        "rapdily",
        "psychich",
        "forawrd",
        "dirrection",
        "whiile",
        "bcomes",
        "efffect",
        "recoves",
        "unabled",
        "illusary",
        "targetted",
        "preceeding",
        "inititally",
        "Meowsacarda",
        "Solagaleo",
        "Pokmon",
        "Pokémn",
        "Pokemon",
        "Hinderances",
        "continus",
        "bounceds",
        "illusionary",
        "SpAtk",
        "uesr",
        "hit's",
        "it'self",
        "it's movement",
        "it's basic",
        "oor hits",
        "lungest",
        "the users ",
        "in designated direction",
        "this moves cooldown",
        "the Trooper's total",
        "Mewtwo attack",
        "leaving the munable",
        "itsm ovement",
        "comet s",
        "used agai and",
        "Compute and Crash",
        "increases.<",
        "whip cream",
        "HP equals to",
        "Every attack more damage",
        "a boosted with every",
        "its not fully",
        "self healing",
        "non movement, non auto attack",
        "One of the variety",
        "zone overrides the",
        "designated panel",
        "jab the in the",
        "damage over tim and",
        "and the decreasing their",
        "damaging opposing over time",
        "once only Fighter Mode",
        "an cone",
        "attacks enemies their feet",
        "for aa set",
        "boosted boosted",
        "the the amount",
        " in in ",
        "within in ",
        "them an slowing",
        "After a dela,",
        "The users throws",
        "area of effect After",
        "to marked enemy",
        "the Enemy falls",
        "while the user in the cloud",
        "times.If",
        "hits.When",
        "hits.The",
        "move.When",
        "direction.The",
        "time.If",
        "attacks.When",
        "ally.Afterward",
        "hits.At",
        "hits Once",
        "time. .",
        "gauge When",
        "\\u201c",
        "\\u201d",
        "coached on allies",
        "A maximum of {0}",
        "hits {0} times",
        "2 use(s)",
        "1 stored use(s)",
        "3 time(s)",
        "HHas the user",
        "conditionss",
        "Pokeon",
        "haas ",
        "designatedd ",
        "telekinitic",
        "telekenitic",
        "up to 1 times",
        "recieved",
        "hinderances",
        "Freeze-Dery",
        "returnn",
        "annd",
        "aand",
        "are of effect",
        "HP. for a short time",
        "time. using this move",
        "direction. if the move hits",
        "time. damage the opposing",
        "net. leaving them",
        "Pokémon. the user's Attack",
        "quietly focuses its mind",
        "2 increment for",
        "for short time",
        "override the previous effects and refreshes the duration",
        "increases up (up to",
        "Unleases",
        "elaves ",
        "obsucres",
        "direciton",
        "befre ",
        "might gust",
        "for a short term",
        "Sp, Atk",
        "shoot a flame of in",
        "Every 2 this Unite",
        "the user Release",
      ];
      const texts = collectUserFacingTexts(bundle);
      for (const bad of banned) {
        const hit = texts.find((t) => t.includes(bad));
        expect(
          hit,
          `banned fragment ${JSON.stringify(bad)} still in ${hit ?? "bundle"}`,
        ).toBeUndefined();
      }
    });

    it("does not ship UNITE-DB placeholders or leftover templates", () => {
      const texts = collectUserFacingTexts(bundle);
      for (const bad of ["{0}", "{1}", "{2}", "use(s)", "time(s)"]) {
        const hit = texts.find((t) => t.includes(bad));
        expect(hit, `template ${JSON.stringify(bad)} still in ${hit ?? "bundle"}`).toBeUndefined();
      }
    });

    it("does not ship ASCII Pokemon or truncated Pokmon marks", () => {
      const texts = collectUserFacingTexts(bundle);
      const hit = texts.find(
        (t) => /\bPokemon\b/.test(t) || t.includes("Pokmon") || t.includes("Pokémn"),
      );
      expect(hit, `Pokémon mark still in ${hit ?? "bundle"}`).toBeUndefined();
    });

    it("does not ship known glued sentences or duplicate words", () => {
      const texts = collectUserFacingTexts(bundle);
      const glues = [
        "times.If",
        "hits.When",
        "hits.The",
        "move.When",
        "direction.The",
        "time.If",
        "attacks.When",
        "ally.Afterward",
        "hits.At",
        "hits Once",
        "time. .",
        "gauge When",
        "effect After",
        "the the ",
        " in in ",
        "within in ",
        "HP. for a short time",
        "time. using this move",
        "direction. if the move hits",
        "time. damage the opposing",
        "net. leaving them",
        "Pokémon. the user's Attack",
      ];
      for (const bad of glues) {
        const hit = texts.find((t) => t.includes(bad));
        expect(hit, `glue ${JSON.stringify(bad)} still in ${hit ?? "bundle"}`).toBeUndefined();
      }
    });

    it("does not ship known unique garbles", () => {
      const texts = collectUserFacingTexts(bundle);
      for (const bad of [
        "itsm ovement",
        "uanble",
        "munable",
        "Compute and Crash",
        "Meowsacarda",
        "Solagaleo",
        "increases.<",
      ]) {
        const hit = texts.find((t) => t.includes(bad));
        expect(hit, `garble ${JSON.stringify(bad)} still in ${hit ?? "bundle"}`).toBeUndefined();
      }
    });
  });

  // Curated-merge regression guard: normalize.py must keep hand-curated emblemName labels.
  it("preserves curated build emblemName from curated_builds.json", () => {
    const skeledirge = bundle.pokemon.find((p) => p.id === "skeledirge")!;
    const build = skeledirge.builds!.find((b) => b.name === "Singing Special Attacker")!;
    expect(build.emblemName).toBe("Singing Special Attacker");
  });

  // Generic UNITE-DB / remap labels. If a refresh ships these again, the
  // lore overlay in curated_builds.json was skipped or a new Pokémon needs titles.
  const GENERIC_BUILD_LABELS = new Set([
    "Standard All-Rounder",
    "Standard Special Attacker",
    "Standard Defender",
    "Standard Speedster",
    "Standard Support",
    "Standard Attacker",
    "Special Attack Bulk",
    "Special Attack Tank",
    "Physical Tank",
    "Physical Damage Tank",
    "Attack Damage Carry (ADC)",
    "Critical Hit Specialist",
    "Legendary Attack Speed",
    "Special Attack Cooldown Reduction - Mobility for Survivability",
    "Special Attack Cooldown Reduction - Bulk for Survivability",
    "Charging Charm (Less Critical Rate, Slight higher bulk)",
    "Special Attack Bulk (No Crit Dump)",
    "Items Only",
    "Dazzling Veil (no emblems)",
    "Bulk Leaning Standard Physical",
    "Bulk Leaning Physical Standard",
    "Offense Leaning Physical Standard",
    "Lv 40 Scope Lens+Lv 40 Razor Claw",
  ]);

  it("does not ship generic UNITE-DB build labels", () => {
    const hits: string[] = [];
    for (const p of bundle.pokemon) {
      for (const tab of ["builds", "creativeBuilds"] as const) {
        for (const b of p[tab] ?? []) {
          const label = b.emblemName ?? b.name ?? "";
          if (GENERIC_BUILD_LABELS.has(label)) {
            hits.push(`${p.id}/${tab}: ${label}`);
          }
        }
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("keeps hand-named Lucario Recommended and Creative builds", () => {
    const lucario = bundle.pokemon.find((p) => p.id === "lucario")!;
    expect(lucario.builds?.map((b) => b.emblemName)).toEqual([
      "Doggo Zoomies",
      "Punch Rush",
      "Punchy Doggy",
      "Amplified Aura Cannon",
    ]);
    expect(lucario.creativeBuilds?.map((b) => b.emblemName)).toEqual([
      "Step on the Gas (Physical)",
    ]);
  });

  it("keeps Sylveon Creative A Fast Fairy", () => {
    const sylveon = bundle.pokemon.find((p) => p.id === "sylveon")!;
    expect(sylveon.creativeBuilds?.map((b) => b.emblemName)).toEqual(["A Fast Fairy"]);
  });

  describe("upgrade-line paragraph formatting", () => {
    it("Pikachu Thunderbolt has a blank line before the upgrade bonus", () => {
      const pikachu = bundle.pokemon.find((p) => p.id === "pikachu")!;
      const thunderbolt = pikachu.moves.find((m) => m.id === "thunderbolt")!;
      expect(thunderbolt.description).toContain("\n\nUpgrade (Level 13):");
    });

    it("Quaquaval Low Sweep / Liquidation Basic text carries the upgrade level", () => {
      const q = bundle.pokemon.find((p) => p.id === "quaquaval")!;
      const lowSweep = q.moves.find((m) => m.name === "Low Sweep")!;
      const liquidation = q.moves.find((m) => m.name === "Liquidation")!;
      expect(lowSweep.description).toContain("\n\nUpgrade (Level 11):");
      expect(liquidation.description).toContain("\n\nUpgrade (Level 13):");
      // no bare marker left anywhere in Basic descriptions
      for (const p of bundle.pokemon) {
        for (const m of p.moves) {
          expect(m.description ?? "", `${p.id}/${m.name}`).not.toMatch(/Upgrade:(?! \(Level)/);
        }
      }
    });

    it("every Upgrade (Level marker is preceded by a blank line", () => {
      const upgradePattern = /Upgrade \(Level/g;
      for (const p of bundle.pokemon) {
        for (const m of p.moves) {
          for (const text of [m.description, m.descriptionAdvanced]) {
            if (!text) continue;
            let match: RegExpExecArray | null;
            while ((match = upgradePattern.exec(text)) !== null) {
              const idx = match.index;
              if (idx > 0) {
                expect(text.slice(idx - 2, idx), `${p.id}/${m.name}`).toBe("\n\n");
              }
            }
          }
        }
        for (const pa of playablePassives(p)) {
          for (const text of [pa.description, pa.descriptionAdvanced]) {
            if (!text) continue;
            let match: RegExpExecArray | null;
            while ((match = upgradePattern.exec(text)) !== null) {
              const idx = match.index;
              if (idx > 0) {
                expect(text.slice(idx - 2, idx), `${p.id}/${pa.id}`).toBe("\n\n");
              }
            }
          }
        }
      }
    });
  });

  describe("move GIF assets", () => {
    it("every gifAsset is a local skills WebP path", () => {
      for (const p of bundle.pokemon) {
        for (const m of p.moves) {
          if (!m.gifAsset) continue;
          expect(m.gifAsset, `${p.id}/${m.name}`).toMatch(/^\/assets\/skills\//);
          expect(m.gifAsset, `${p.id}/${m.name}`).toMatch(/\.webp$/);
        }
        for (const pa of playablePassives(p)) {
          if (pa.gifAsset) {
            expect(pa.gifAsset, `${p.id}/${pa.id}`).toMatch(/^\/assets\/skills\//);
            expect(pa.gifAsset, `${p.id}/${pa.id}`).toMatch(/\.webp$/);
          }
        }
      }
    });

    it("Garchomp has no gifAsset but keeps iconAsset on moves (fallback)", () => {
      const garchomp = bundle.pokemon.find((p) => p.id === "garchomp")!;
      for (const m of garchomp.moves) {
        if (m.slot === "basicAttack") continue;
        expect(m.gifAsset).toBeUndefined();
        expect(m.iconAsset).toMatch(/^\/assets\/skills\//);
      }
      expect(garchomp.passiveAbility.gifAsset).toBeUndefined();
    });
  });

  describe("move video assets", () => {
    it("Talonflame Fly has a well-formed videoAsset", () => {
      const talonflame = bundle.pokemon.find((p) => p.id === "talonflame")!;
      const fly = talonflame.moves.find((m) => m.id === "fly")!;
      expect(fly.videoAsset).toBe("/assets/skills/Talonflame/Fly.mp4");
    });

    it("every videoAsset is a local skills MP4 path", () => {
      for (const p of bundle.pokemon) {
        for (const m of p.moves) {
          if (!m.videoAsset) continue;
          expect(m.videoAsset, `${p.id}/${m.name}`).toMatch(/^\/assets\/skills\//);
          expect(m.videoAsset, `${p.id}/${m.name}`).toMatch(/\.mp4$/);
        }
        for (const pa of playablePassives(p)) {
          if (pa.videoAsset) {
            expect(pa.videoAsset, `${p.id}/${pa.id}`).toMatch(/^\/assets\/skills\//);
            expect(pa.videoAsset, `${p.id}/${pa.id}`).toMatch(/\.mp4$/);
          }
        }
      }
    });

    it("Reshiram Turboblaze passive has a videoAsset and no redundant gifAsset", () => {
      const reshiram = bundle.pokemon.find((p) => p.id === "reshiram")!;
      expect(reshiram.passiveAbility.id).toBe("turboblaze");
      expect(reshiram.passiveAbility.videoAsset).toBe("/assets/skills/Reshiram/Turboblaze.mp4");
      expect(reshiram.passiveAbility.gifAsset).toBeUndefined();
    });

    it("a move with videoAsset does not carry a redundant gifAsset", () => {
      const talonflame = bundle.pokemon.find((p) => p.id === "talonflame")!;
      const fly = talonflame.moves.find((m) => m.id === "fly")!;
      expect(fly.videoAsset).toBeDefined();
      expect(fly.gifAsset).toBeUndefined();
    });

    it("no move carries both videoAsset and gifAsset", () => {
      for (const p of bundle.pokemon) {
        for (const m of p.moves) {
          if (!m.videoAsset) continue;
          expect(m.gifAsset, `${p.id}/${m.name}`).toBeUndefined();
        }
      }
    });

    it("every non-basicAttack move has videoAsset when the roster clip registry is complete", () => {
      for (const p of bundle.pokemon) {
        for (const m of p.moves) {
          if (m.slot === "basicAttack") continue;
          expect(m.videoAsset, `${p.id}/${m.name}`).toBeDefined();
        }
      }
    });
  });

  describe("Unite-move levels and activation-note cleanup", () => {
    it("gives every Unite move a numeric upgradeLevel", () => {
      for (const p of bundle.pokemon) {
        for (const m of p.moves) {
          if (m.slot !== "uniteMove") continue;
          expect(typeof m.upgradeLevel, `${p.id}/${m.name}`).toBe("number");
        }
      }
    });

    it("leaves no 'Activates at Level' note in any description", () => {
      for (const p of bundle.pokemon) {
        for (const m of p.moves) {
          expect(m.description ?? "", `${p.id}/${m.name}`).not.toContain("Activates at Level");
          expect(m.descriptionAdvanced ?? "", `${p.id}/${m.name}`).not.toContain(
            "Activates at Level",
          );
        }
      }
    });

    it("Quaquaval Carnival Splash is Lv 9", () => {
      const q = bundle.pokemon.find((p) => p.id === "quaquaval")!;
      const cs = q.moves.find((m) => m.name === "Carnival Splash")!;
      expect(cs.upgradeLevel).toBe(9);
    });

    it("Blaziken Spinning Flame Kick has its Basic text and Spinning Flame Fist is space-fixed", () => {
      const b = bundle.pokemon.find((p) => p.id === "blaziken")!;
      const kick = b.moves.find((m) => m.name === "Spinning Flame Kick")!;
      const fist = b.moves.find((m) => m.name === "Spinning Flame Fist")!;
      expect(kick.description).toContain("switches to kick style");
      expect(kick.upgradeLevel).toBe(8);
      expect(fist.description).toContain("for a short time.\n\nAfter using this move");
      expect(fist.description).not.toContain("time.After");
    });
  });
});
