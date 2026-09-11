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
      for (const b of p.builds ?? []) {
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
        "Upgrade (Level 13): Also throws enemies when this move hits.",
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
      expect(byId["flamethrower"].description).toContain(
        "Upgrade (Level 11): Increases this move's damage, and the damage caused by burning.",
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
      expect(mega.description).toContain("maximum three counters");
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

    it("Tyranitar shows Sand Stream and in-game Basic, not Larvitar Guts", () => {
      const tyranitar = bundle.pokemon.find((p) => p.id === "tyranitar")!;
      expect(tyranitar.passiveAbility.id).toBe("sand-stream");
      expect(tyranitar.passiveAbility.name).toBe("Sand Stream");
      expect(tyranitar.passiveAbility.iconAsset).toContain("Sand+Stream");
      expect(tyranitar.passiveAbility.description).toContain("sandstorm");
      expect(tyranitar.passiveAbility.description).toContain("Unite Move");
      expect(tyranitar.passiveAbility.description).not.toContain("Larvitar");
      expect(tyranitar.passiveAbility.description).not.toContain("10%");
    });

    it("playable Abilities use in-game Basic, not pre-evolution leftovers", () => {
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
          id: "raichu",
          name: "Surge Surfer",
          file: "Surge+Surfer",
          needle: "while moving",
          not: "paralyzes all nearby",
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
        expect(p.passiveAbility.name, c.id).toBe(c.name);
        expect(p.passiveAbility.iconAsset, c.id).toContain(c.file);
        expect(p.passiveAbility.description, c.id).toContain(c.needle);
        expect(p.passiveAbility.description, c.id).not.toContain(c.not);
      }
      const mew = bundle.pokemon.find((p) => p.id === "mew")!;
      expect(mew.passiveAbility.name).toBe("Synchronize");
      expect(mew.passiveAbility.id).toBe("synchronize");
      expect(mew.passiveAbility.description).toContain("movement speed");
      expect(mew.passiveAbility.description).toContain("Move Reset");
    });

    it("Sylveon shows Pixilate and in-game Basic move text", () => {
      const sylveon = bundle.pokemon.find((p) => p.id === "sylveon")!;
      const byId = Object.fromEntries(sylveon.moves.map((m) => [m.id, m]));

      expect(sylveon.passiveAbility.id).toBe("pixilate");
      expect(sylveon.passiveAbility.name).toBe("Pixilate");
      expect(sylveon.passiveAbility.iconAsset).toContain("Pixilate");
      expect(sylveon.passiveAbility.description).toContain("Sp. Atk and Sp. Def");
      expect(sylveon.passiveAbility.description).not.toContain("Eevee");
      expect(sylveon.passiveAbility.description).not.toContain("5%");
      expect(sylveon.passiveAbility.descriptionAdvanced).toContain("5%");
      expect(sylveon.passiveAbility.descriptionAdvanced).toContain("1.5s");

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
      expect(byId["calm-mind"].description).not.toContain("40%");

      expect(byId["baby-doll-eyes"].description).toContain("Has the user stare");

      expect(byId["fairy-frolic"].description).toContain("a set percentage");
      expect(byId["fairy-frolic"].description).not.toContain("50%");
      expect(byId["fairy-frolic"].description).not.toContain("10s");

      expect(byId["mystical-fire"].description).toMatch(/^Has the user create four small flames/);
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
        { id: "mega-gyarados", pre: "Intimidate", mega: "Mold Breaker", megaFile: "Mold+Breaker" },
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
      const megaBasics = [
        {
          id: "mega-charizard-x",
          needle: "maximum three counters",
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
      for (const id of ["mewtwox", "mewtwoy", "lucario", "sylveon"] as const) {
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
