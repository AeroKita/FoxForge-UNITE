"""Unit tests for normalize.py helpers."""

from __future__ import annotations

import unittest

from normalize import (
    _norm_move_name,
    advanced_desc,
    append_upgrade_from_advanced,
    apply_patch_note_overrides,
    build_emblems,
    build_upgrade_move,
    description_body,
    ensure_sentence_end,
    fix_spelling,
    fix_spelling_deep,
    passive_basic_desc,
    resolve_playable_passive,
    reword_add_label,
    strip_activation_note,
)


class TestNormMoveName(unittest.TestCase):
    """_norm_move_name must fold diacritics so accented and ASCII spellings share one key."""

    def test_folds_diacritics(self):
        self.assertEqual(_norm_move_name("Lumière of Demise"), "lumiere of demise")

    def test_plain_ascii_unchanged(self):
        self.assertEqual(_norm_move_name("Thunderbolt"), "thunderbolt")
        self.assertEqual(_norm_move_name("Power-Up Punch"), "power-up punch")


class TestStripActivationNote(unittest.TestCase):
    def test_with_period(self):
        self.assertEqual(
            strip_activation_note("...kick style. Activates at Level 9"),
            "...kick style.",
        )

    def test_without_period(self):
        self.assertEqual(
            strip_activation_note("...loses its shield Activates at Level 8"),
            "...loses its shield.",
        )

    def test_noop(self):
        self.assertEqual(strip_activation_note("A plain sentence."), "A plain sentence.")


class TestEnsureSentenceEnd(unittest.TestCase):
    """ensure_sentence_end adds terminal .?! punctuation per Basic paragraph."""

    def test_empty(self):
        self.assertEqual(ensure_sentence_end(""), "")

    def test_already_ended(self):
        self.assertEqual(ensure_sentence_end("Deals damage."), "Deals damage.")

    def test_adds_period(self):
        self.assertEqual(ensure_sentence_end("Deals damage"), "Deals damage.")

    def test_preserves_exclamation_and_question(self):
        self.assertEqual(ensure_sentence_end("Deals damage!"), "Deals damage!")
        self.assertEqual(ensure_sentence_end("Deals damage?"), "Deals damage?")

    def test_multi_paragraph(self):
        self.assertEqual(
            ensure_sentence_end("Line one\n\nLine two"),
            "Line one.\n\nLine two.",
        )

    def test_upgrade_line(self):
        self.assertEqual(
            ensure_sentence_end("Upgrade (Level 13): Increased damage"),
            "Upgrade (Level 13): Increased damage.",
        )


class TestAppendUpgradeFromAdvanced(unittest.TestCase):
    """append_upgrade_from_advanced copies only Advanced's Upgrade paragraph onto Basic."""

    def test_basic_already_has_level_upgrade_unchanged(self):
        basic = "Body text.\n\nUpgrade (Level 11): More damage."
        advanced = "Adv body.\n\nUpgrade (Level 11): Different wording with 20%."
        self.assertEqual(append_upgrade_from_advanced(basic, advanced), basic)

    def test_basic_already_has_bare_upgrade_unchanged(self):
        basic = "Body text.\n\nUpgrade: More damage."
        advanced = "Adv body.\n\nUpgrade (Level 11): Different wording."
        self.assertEqual(append_upgrade_from_advanced(basic, advanced), basic)

    def test_appends_upgrade_paragraph_only(self):
        basic = "Has the user throw consecutive flames."
        advanced = (
            "Throws consecutive flames in an arc.\n\n"
            "Burns tick every 0.5s for 5 damage ticks.\n\n"
            "Upgrade (Level 11): This move's cooldown is reduced by 1s."
        )
        out = append_upgrade_from_advanced(basic, advanced)
        self.assertEqual(
            out,
            "Has the user throw consecutive flames.\n\n"
            "Upgrade (Level 11): This move's cooldown is reduced by 1s.",
        )
        self.assertNotIn("Throws consecutive", out)
        self.assertNotIn("Burns tick", out)

    def test_empty_basic_returns_upgrade_only(self):
        advanced = "Body.\n\nUpgrade (Level 13): Increases the slow."
        self.assertEqual(
            append_upgrade_from_advanced("", advanced),
            "Upgrade (Level 13): Increases the slow.",
        )

    def test_no_upgrade_in_advanced_leaves_basic(self):
        basic = "Body text."
        self.assertEqual(append_upgrade_from_advanced(basic, "No upgrade here."), basic)

    def test_idempotent(self):
        basic = "Has the user shoot fire."
        advanced = "Shoot fire.\n\nUpgrade (Level 11): If the explosion hits, +20% damage."
        once = append_upgrade_from_advanced(basic, advanced)
        twice = append_upgrade_from_advanced(once, advanced)
        self.assertEqual(once, twice)
        self.assertEqual(once.count("Upgrade (Level 11):"), 1)


class TestPassiveBasicDesc(unittest.TestCase):
    def test_unite_db_description_present(self):
        passive = {"name": "Dark Aura", "description": "From UNITE-DB.", "rsb": {"true_desc": "Advanced."}}
        over = {"dark aura": "Override text."}
        self.assertEqual(passive_basic_desc(passive, over), "From UNITE-DB.")

    def test_blank_description_uses_override(self):
        passive = {"name": "Dark Aura", "description": "", "rsb": {"true_desc": "Advanced."}}
        over = {"dark aura": "Override text."}
        self.assertEqual(passive_basic_desc(passive, over), "Override text.")

    def test_both_blank_falls_back_to_rsb(self):
        passive = {"name": "Dark Aura", "description": "", "rsb": {"true_desc": "Advanced text."}}
        self.assertEqual(passive_basic_desc(passive, {}), "Advanced text.")

    def test_none_passive_returns_empty(self):
        self.assertEqual(passive_basic_desc(None, {}), "")


class TestResolvePlayablePassive(unittest.TestCase):
    """resolve_playable_passive picks Solgaleo Full Metal Body and Sylveon Pixilate."""

    _SOLGALEO = {
        "ability": "Passive",
        "name": "Unaware",
        "description": "Reduces physical and special type damage by 30%.",
        "passive2_name": "Sturdy",
        "passive2_description": "The user has 30% damage reduction.",
        "passive3_name": "Full Metal Body",
        "passive3_description": "Solgaleo's Attack stat cannot be lowered through debuffs.",
        "rsb": {"true_desc": "Unaware Advanced. Ignores 30% Atk and Sp. Atk."},
    }

    def test_none_passthrough(self):
        self.assertIsNone(resolve_playable_passive(None, "Solgaleo"))

    def test_other_pokemon_keeps_pre_evo_name(self):
        skill = {
            "name": "Guts",
            "description": "Larvitar Attack increase.",
            "passive3_name": "Sand Stream",
            "passive3_description": "Summons a sandstorm.",
            "rsb": {"true_desc": "Guts Advanced."},
        }
        out = resolve_playable_passive(skill, "Tyranitar")
        self.assertIs(out, skill)
        self.assertEqual(out["name"], "Guts")

    def test_solgaleo_uses_passive3_name(self):
        out = resolve_playable_passive(self._SOLGALEO, "Solgaleo")
        self.assertEqual(out["name"], "Full Metal Body")

    def test_solgaleo_blanks_description_for_archive_backfill(self):
        out = resolve_playable_passive(self._SOLGALEO, "Solgaleo")
        self.assertEqual(out["description"], "")
        self.assertEqual(
            passive_basic_desc(out, {"full metal body": "This Pokémon's Attack does not decrease."}),
            "This Pokémon's Attack does not decrease.",
        )

    def test_solgaleo_advanced_uses_staged_text_not_unaware_rsb(self):
        out = resolve_playable_passive(self._SOLGALEO, "Solgaleo")
        self.assertEqual(
            (out.get("rsb") or {}).get("true_desc"),
            "Solgaleo's Attack stat cannot be lowered through debuffs.",
        )
        self.assertNotIn("Unaware Advanced", (out.get("rsb") or {}).get("true_desc") or "")

    def test_solgaleo_without_staged_names_unchanged(self):
        skill = {"name": "Unaware", "description": "Pre-evo only.", "rsb": {"true_desc": "Adv."}}
        out = resolve_playable_passive(skill, "Solgaleo")
        self.assertIs(out, skill)

    _SYLVEON = {
        "ability": "Passive",
        "name": "Adaptability",
        "description": (
            "Every time Eevee deals or receives damage, increase Sp. Attack by 5% "
            "for 1.5s, stacking up to 4 times."
        ),
        "passive2_name": "Pixilate",
        "passive2_description": (
            "Every time Sylveon deals or receives damage, increase Sp. Atk and "
            "Sp. Defense by 5% for 1.5s, stacking up to 4 times."
        ),
        "rsb": {
            "true_desc": (
                "Every time Eevee deals or receives damage, increase Sp. Attack "
                "by 5% for 1.5s, stacking up to 4 times."
            )
        },
    }
    _PIXILATE_BASIC = (
        "Every time the Pokémon deals or receives damage, its Sp. Atk and Sp. Def "
        "are increased for a short time."
    )

    def test_sylveon_uses_passive2_pixilate(self):
        out = resolve_playable_passive(self._SYLVEON, "Sylveon")
        self.assertEqual(out["name"], "Pixilate")
        self.assertEqual(out["description"], "")
        self.assertEqual(
            (out.get("rsb") or {}).get("true_desc"),
            self._SYLVEON["passive2_description"],
        )

    def test_sylveon_blanks_description_for_archive_backfill(self):
        out = resolve_playable_passive(self._SYLVEON, "Sylveon")
        self.assertEqual(
            passive_basic_desc(out, {"pixilate": self._PIXILATE_BASIC}),
            self._PIXILATE_BASIC,
        )

    def test_sylveon_fixture_does_not_promote_espeon(self):
        out = resolve_playable_passive(self._SYLVEON, "Espeon")
        self.assertIs(out, self._SYLVEON)
        self.assertEqual(out["name"], "Adaptability")


class TestDescriptionBody(unittest.TestCase):
    """description_body strips Upgrade paragraphs so leftover upgrade-only text is empty."""

    def test_upgrade_only_is_empty(self):
        self.assertEqual(
            description_body("Upgrade (Level 10): Increases the number of flames by one."),
            "",
        )

    def test_body_survives_upgrade_paragraph(self):
        self.assertEqual(
            description_body("Body.\n\nUpgrade (Level 10): Bonus."),
            "Body.",
        )


class TestBuildUpgradeMove(unittest.TestCase):
    def test_bare_upgrade_marker_gets_level_from_level2(self):
        up = {"name": "Low Sweep", "description1": "Body.\n\nUpgrade: More damage.", "level2": "11"}
        move = build_upgrade_move(up, "move1", "Quaquaval")
        self.assertIn("Upgrade (Level 11):", move["description"])
        self.assertNotIn("Upgrade:", move["description"].replace("Upgrade (Level 11):", ""))

    def test_empty_description1_does_not_compose_upgrade_only_basic(self):
        """Empty description1 + description2 must leave no Basic body for archive backfill."""
        up = {
            "name": "Mystical Fire",
            "description1": "",
            "description2": "Increases the number of flames by one.",
            "level2": "10",
        }
        move = build_upgrade_move(up, "move1", "Sylveon")
        self.assertEqual(description_body(move["description"]), "")
        self.assertEqual((move["description"] or "").strip(), "")

    def test_existing_body_still_appends_description2(self):
        up = {
            "name": "Mystical Fire",
            "description1": "Leap and throw flames.",
            "description2": "Increases the number of flames by one.",
            "level2": "10",
        }
        move = build_upgrade_move(up, "move1", "Sylveon")
        self.assertIn("Leap and throw flames.", move["description"])
        self.assertIn("Upgrade (Level 10): Increases the number of flames by one.", move["description"])


class TestFixSpelling(unittest.TestCase):
    def test_known_misspellings(self):
        self.assertEqual(fix_spelling("Chicorita"), "Chikorita")
        self.assertEqual(fix_spelling("Ho-oh"), "Ho-Oh")
        self.assertEqual(fix_spelling("Lumiere of Demise"), "Lumière of Demise")
        self.assertEqual(fix_spelling("20% movemenr speed"), "20% movement speed")
        self.assertEqual(fix_spelling("oppposing Pokémon"), "opposing Pokémon")
        self.assertEqual(fix_spelling("the intial area"), "the initial area")
        self.assertEqual(fix_spelling("deacrease auto attack"), "decrease auto attack")
        self.assertEqual(fix_spelling("a damge-over-time condition"), "a damage-over-time condition")
        self.assertEqual(fix_spelling("boosted basic attakck gauge"), "boosted basic attack gauge")
        self.assertEqual(fix_spelling("nulliffied"), "nullified")
        self.assertEqual(fix_spelling("Thundershock and Spark"), "Thunder Shock and Spark")
        self.assertEqual(fix_spelling("circles of shadoww are"), "circles of shadow are")
        self.assertEqual(fix_spelling("Pokémon isnide the nightmare"), "Pokémon inside the nightmare")
        self.assertEqual(fix_spelling("Movement speeed decrease"), "Movement speed decrease")
        self.assertEqual(fix_spelling("Pokémon it hitos"), "Pokémon it hits")
        self.assertEqual(fix_spelling("time pases, or"), "time passes, or")
        self.assertEqual(fix_spelling("leaving it uanble to act"), "leaving it unable to act")
        self.assertEqual(fix_spelling("If othr Pokémon"), "If other Pokémon")
        self.assertEqual(fix_spelling("Unite guage is consumed"), "Unite gauge is consumed")
        self.assertEqual(fix_spelling("sprint gauage is full"), "sprint gauge is full")
        self.assertEqual(fix_spelling("min disatance"), "min distance")
        self.assertEqual(fix_spelling("oppsing Pokémon"), "opposing Pokémon")
        self.assertEqual(fix_spelling("blasing out a huge volume"), "blasting out a huge volume")
        self.assertEqual(fix_spelling("Blass intense"), "Blasts intense")
        self.assertEqual(fix_spelling("spin rapdily"), "spin rapidly")
        self.assertEqual(fix_spelling("psychich projectiles"), "psychic projectiles")
        self.assertEqual(fix_spelling("charging forawrd"), "charging forward")
        self.assertEqual(fix_spelling("designated dirrection"), "designated direction")
        self.assertEqual(fix_spelling("whiile cloaked"), "while cloaked")
        self.assertEqual(fix_spelling("and bcomes hard"), "and becomes hard")
        self.assertEqual(fix_spelling("a shield efffect"), "a shield effect")
        self.assertEqual(fix_spelling("the user recoves"), "the user recovers")
        self.assertEqual(fix_spelling("left unabled to act"), "left unable to act")
        self.assertEqual(fix_spelling("an illusary copy"), "an illusory copy")
        self.assertEqual(fix_spelling("non targetted enemy"), "non targeted enemy")
        self.assertEqual(fix_spelling("the preceeding waves"), "the preceding waves")
        self.assertEqual(fix_spelling("30% inititally"), "30% initially")
        self.assertEqual(fix_spelling("During the blink, Meowsacarda is"), "During the blink, Meowscarada is")
        self.assertEqual(fix_spelling("Solagaleo can see"), "Solgaleo can see")
        self.assertEqual(fix_spelling("opposing Pokmon"), "opposing Pokémon")
        self.assertEqual(fix_spelling("opposing Pokémn"), "opposing Pokémon")
        self.assertEqual(fix_spelling("Wild Pokemon"), "Wild Pokémon")
        self.assertEqual(fix_spelling("Hinderances and status"), "Hindrances and status")
        self.assertEqual(fix_spelling("damage continus to"), "damage continues to")
        self.assertEqual(fix_spelling("when it bounceds"), "when it bounces")
        self.assertEqual(fix_spelling("two illusionary copies"), "two illusory copies")
        self.assertEqual(fix_spelling("15% SpAtk for 8s"), "15% Sp. Atk for 8s")
        self.assertEqual(fix_spelling("while the uesr is flying"), "while the user is flying")
        self.assertEqual(fix_spelling("Pokémon it hit's"), "Pokémon it hits")
        self.assertEqual(fix_spelling("in front of it'self"), "in front of itself")
        self.assertEqual(fix_spelling("increasing it's movement speed"), "increasing its movement speed")
        self.assertEqual(fix_spelling("it's basic attack pattern"), "its basic attack pattern")
        self.assertEqual(fix_spelling("oor hits Pokémon"), "or hits Pokémon")
        self.assertEqual(fix_spelling("the user lungest toward"), "the user lunges toward")
        self.assertEqual(fix_spelling("while the users Attack is"), "while the user's Attack is")
        self.assertEqual(fix_spelling("in designated direction"), "in the designated direction")
        self.assertEqual(fix_spelling("Reduces this moves cooldown"), "Reduces this move's cooldown")
        self.assertEqual(fix_spelling("the Trooper's total damage"), "the Troopers' total damage")
        self.assertEqual(fix_spelling("increases Mewtwo attack by"), "increases Mewtwo's Attack by")

    def test_cooldown_abbrev_uppercases_cd(self):
        self.assertEqual(fix_spelling("triggered (4s cd)."), "triggered (4s CD).")
        self.assertEqual(fix_spelling("goes on a 4s cd after"), "goes on a 4s CD after")
        self.assertEqual(fix_spelling("berry drop (4.5s cd)."), "berry drop (4.5s CD).")
        self.assertEqual(fix_spelling("already (4s CD)."), "already (4s CD).")

    def test_collapses_extra_spaces(self):
        self.assertEqual(fix_spelling("enemies  in the explosion"), "enemies in the explosion")
        self.assertEqual(fix_spelling("already single"), "already single")

    def test_noop_passthrough(self):
        self.assertEqual(fix_spelling("Pikachu"), "Pikachu")

    def test_lowercase_slugs_untouched(self):
        self.assertEqual(fix_spelling("250-ho-oh"), "250-ho-oh")
        self.assertEqual(fix_spelling("lumiere-of-demise"), "lumiere-of-demise")
        self.assertEqual(fix_spelling("some-pokemon-id"), "some-pokemon-id")


class TestFixSpellingDeep(unittest.TestCase):
    def test_rewrites_nested_string_values(self):
        fixture = {
            "name": "Ho-oh",
            "nested": {"description": "Ho-oh recovers HP"},
            "items": ["Chicorita", "plain"],
            "count": 42,
        }
        out = fix_spelling_deep(fixture)
        self.assertEqual(out["name"], "Ho-Oh")
        self.assertEqual(out["nested"]["description"], "Ho-Oh recovers HP")
        self.assertEqual(out["items"], ["Chikorita", "plain"])
        self.assertEqual(out["count"], 42)

    def test_skips_asset_path_fields(self):
        fixture = {
            "name": "Lumiere of Demise",
            "iconAsset": "/assets/skills/Yveltal/Lumiere+of+Demise.png",
            "videoAsset": "/assets/skills/Yveltal/Lumiere+of+Demise.mp4",
        }
        out = fix_spelling_deep(fixture)
        self.assertEqual(out["name"], "Lumière of Demise")
        self.assertEqual(out["iconAsset"], "/assets/skills/Yveltal/Lumiere+of+Demise.png")
        self.assertEqual(out["videoAsset"], "/assets/skills/Yveltal/Lumiere+of+Demise.mp4")


class TestBuildEmblemsSpelling(unittest.TestCase):
    def test_chicorita_and_ho_oh_display_names(self):
        rows = [
            {
                "name": "152A",
                "pokedex": "152",
                "grade": "A",
                "display_name": "Chicorita",
                "color1": "Green",
                "stats": [],
            },
            {
                "name": "250A",
                "pokedex": "250",
                "grade": "A",
                "display_name": "Ho-oh",
                "color1": "Red",
                "stats": [],
            },
        ]
        out = build_emblems(rows)
        by_id = {e["id"]: e for e in out}
        self.assertEqual(by_id["152-chikorita"]["pokemonName"], "Chikorita")
        self.assertEqual(by_id["250-ho-oh"]["pokemonName"], "Ho-Oh")


class TestAdvancedDescLabels(unittest.TestCase):
    """advanced_desc must label secondary add{N}_true_desc fragments with their
    (reworded) add{N}_label so no context-free value paragraphs reach users."""

    def test_add_fragment_is_prefixed_with_reworded_label(self):
        rsb = {
            "true_desc": "Main move text.",
            "add1_label": "Shield - Additional",
            "add1_true_desc": "8.5% max HP",
        }
        self.assertEqual(
            advanced_desc(rsb),
            "Main move text.\n\nShield: 8.5% max HP",
        )

    def test_add_fragment_without_label_stays_bare(self):
        rsb = {
            "true_desc": "Main move text.",
            "add1_label": "",
            "add1_true_desc": "Deals half damage.",
        }
        self.assertEqual(
            advanced_desc(rsb),
            "Main move text.\n\nDeals half damage.",
        )

    def test_multiple_adds_each_get_their_own_label(self):
        rsb = {
            "true_desc": "Main move text.",
            "add1_label": "Above 70% HP",
            "add1_true_desc": "1.1s Stun",
            "add2_label": "Below 40% HP",
            "add2_true_desc": "1.5s Stun",
        }
        self.assertEqual(
            advanced_desc(rsb),
            "Main move text.\n\nAbove 70% HP: 1.1s Stun\n\nBelow 40% HP: 1.5s Stun",
        )

    def test_reword_map_covers_common_families(self):
        self.assertEqual(reword_add_label("Shield - Additional"), "Shield")
        self.assertEqual(reword_add_label("Damage - Execute"), "Execute damage")
        self.assertEqual(reword_add_label("Heal"), "Healing")
        self.assertEqual(reword_add_label("Damage - DoT (21 Ticks)"), "Damage over time (21 ticks)")

    def test_unknown_label_passes_through_verbatim(self):
        self.assertEqual(reword_add_label("Some Future Label"), "Some Future Label")


def _minimal_override_bundle() -> dict:
    """One Pokémon with one move, one passive, one held item, and one battle item."""
    return {
        "pokemon": [{
            "id": "testmon",
            "moves": [{
                "id": "test-move",
                "cooldownSeconds": 8.5,
                "damageInstances": [
                    {"ratio": 1.0, "slider": 10.0, "base": 100.0, "scalingStat": "attack", "damageType": "physical"},
                    {"ratio": 2.0, "slider": 20.0, "base": 200.0, "scalingStat": "attack", "damageType": "physical"},
                ],
                "description": "Basic text.",
                "descriptionAdvanced": "Advanced text with 8.5% max HP.",
            }],
            "passiveAbility": {
                "id": "test-passive",
                "description": "Passive basic.",
                "descriptionAdvanced": "Passive Advanced with damage-over time.",
            },
        }],
        "heldItems": [{
            "id": "test-item",
            "description": "Boost by 11/14/17%.",
            "effect": {"label": "HP", "tiers": ["11%", "14%", "17%"]},
        }],
        "battleItems": [{
            "id": "test-battle",
            "description": "Additional applications on an affected goal zone overrides the previous effects.",
        }],
    }


class TestApplyPatchNoteOverrides(unittest.TestCase):
    def test_set_move_field_applies_when_expect_matches(self):
        bundle = _minimal_override_bundle()
        overrides = [{
            "kind": "set",
            "pokemon": "testmon",
            "move": "test-move",
            "field": "cooldownSeconds",
            "expect": 8.5,
            "value": 8.0,
            "why": "test cooldown",
        }]
        applied, skipped = apply_patch_note_overrides(bundle, overrides)
        self.assertEqual(applied, 1)
        self.assertEqual(skipped, 0)
        self.assertEqual(bundle["pokemon"][0]["moves"][0]["cooldownSeconds"], 8.0)

    def test_set_move_field_skips_when_expect_mismatches(self):
        bundle = _minimal_override_bundle()
        overrides = [{
            "kind": "set",
            "pokemon": "testmon",
            "move": "test-move",
            "field": "cooldownSeconds",
            "expect": 7.0,
            "value": 8.0,
            "why": "test cooldown",
        }]
        applied, skipped = apply_patch_note_overrides(bundle, overrides)
        self.assertEqual(applied, 0)
        self.assertEqual(skipped, 1)
        self.assertEqual(bundle["pokemon"][0]["moves"][0]["cooldownSeconds"], 8.5)

    def test_set_item_effect_tiers_applies_on_exact_list_match(self):
        bundle = _minimal_override_bundle()
        overrides = [{
            "kind": "set",
            "item": "test-item",
            "field": "effect.tiers",
            "expect": ["11%", "14%", "17%"],
            "value": ["17%", "20%", "23%"],
            "why": "test tiers",
        }]
        applied, skipped = apply_patch_note_overrides(bundle, overrides)
        self.assertEqual(applied, 1)
        self.assertEqual(skipped, 0)
        self.assertEqual(
            bundle["heldItems"][0]["effect"]["tiers"],
            ["17%", "20%", "23%"],
        )

    def test_scale_damage_multiplies_listed_instances_only(self):
        bundle = _minimal_override_bundle()
        overrides = [{
            "kind": "scaleDamage",
            "pokemon": "testmon",
            "move": "test-move",
            "instances": [0],
            "expectRatios": [1.0],
            "factor": 1.5,
            "why": "test scale",
        }]
        applied, skipped = apply_patch_note_overrides(bundle, overrides)
        self.assertEqual(applied, 1)
        self.assertEqual(skipped, 0)
        inst0 = bundle["pokemon"][0]["moves"][0]["damageInstances"][0]
        inst1 = bundle["pokemon"][0]["moves"][0]["damageInstances"][1]
        self.assertEqual(inst0["ratio"], 1.5)
        self.assertEqual(inst0["slider"], 15.0)
        self.assertEqual(inst0["base"], 150.0)
        self.assertEqual(inst1["ratio"], 2.0)
        self.assertEqual(inst1["slider"], 20.0)
        self.assertEqual(inst1["base"], 200.0)

    def test_scale_damage_skips_when_expect_ratios_mismatch(self):
        bundle = _minimal_override_bundle()
        overrides = [{
            "kind": "scaleDamage",
            "pokemon": "testmon",
            "move": "test-move",
            "instances": [0, 1],
            "expectRatios": [1.0, 2.5],
            "factor": 1.5,
            "why": "test scale",
        }]
        applied, skipped = apply_patch_note_overrides(bundle, overrides)
        self.assertEqual(applied, 0)
        self.assertEqual(skipped, 1)
        inst0 = bundle["pokemon"][0]["moves"][0]["damageInstances"][0]
        inst1 = bundle["pokemon"][0]["moves"][0]["damageInstances"][1]
        self.assertEqual(inst0["ratio"], 1.0)
        self.assertEqual(inst1["ratio"], 2.0)

    def test_replace_text_rewrites_named_field(self):
        bundle = _minimal_override_bundle()
        overrides = [{
            "kind": "replaceText",
            "pokemon": "testmon",
            "move": "test-move",
            "fields": ["descriptionAdvanced"],
            "find": "8.5% max HP",
            "replace": "9.35% max HP",
            "why": "test text",
        }]
        applied, skipped = apply_patch_note_overrides(bundle, overrides)
        self.assertEqual(applied, 1)
        self.assertEqual(skipped, 0)
        self.assertIn("9.35% max HP", bundle["pokemon"][0]["moves"][0]["descriptionAdvanced"])
        self.assertNotIn("8.5% max HP", bundle["pokemon"][0]["moves"][0]["descriptionAdvanced"])

    def test_replace_text_rewrites_passive_field(self):
        bundle = _minimal_override_bundle()
        overrides = [{
            "kind": "replaceText",
            "pokemon": "testmon",
            "move": "test-passive",
            "fields": ["descriptionAdvanced"],
            "find": "damage-over time",
            "replace": "damage-over-time",
            "why": "test passive text",
        }]
        applied, skipped = apply_patch_note_overrides(bundle, overrides)
        self.assertEqual(applied, 1)
        self.assertEqual(skipped, 0)
        self.assertIn(
            "damage-over-time",
            bundle["pokemon"][0]["passiveAbility"]["descriptionAdvanced"],
        )
        self.assertNotIn(
            "damage-over time",
            bundle["pokemon"][0]["passiveAbility"]["descriptionAdvanced"],
        )

    def test_replace_text_expires_when_find_absent(self):
        bundle = _minimal_override_bundle()
        overrides = [{
            "kind": "replaceText",
            "item": "test-item",
            "fields": ["description"],
            "find": "by 99/99/99%",
            "replace": "by 17/20/23%",
            "why": "test text",
        }]
        applied, skipped = apply_patch_note_overrides(bundle, overrides)
        self.assertEqual(applied, 0)
        self.assertEqual(skipped, 1)
        self.assertEqual(bundle["heldItems"][0]["description"], "Boost by 11/14/17%.")

    def test_replace_text_rewrites_battle_item_by_item_id(self):
        bundle = _minimal_override_bundle()
        overrides = [{
            "kind": "replaceText",
            "item": "test-battle",
            "fields": ["description"],
            "find": "zone overrides the",
            "replace": "zone override the",
            "why": "test battle-item text",
        }]
        applied, skipped = apply_patch_note_overrides(bundle, overrides)
        self.assertEqual(applied, 1)
        self.assertEqual(skipped, 0)
        self.assertIn("zone override the", bundle["battleItems"][0]["description"])
        self.assertNotIn("zone overrides the", bundle["battleItems"][0]["description"])


if __name__ == "__main__":
    unittest.main()
