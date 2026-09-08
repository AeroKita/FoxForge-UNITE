"""Unit tests for the one-shot Game8 Effect ingest (fixtures only; no network)."""

from __future__ import annotations

import unittest
from pathlib import Path

from ingest_game8_effects import (
    LOCKED_ABILITIES,
    accept_ability,
    accept_move,
    effect_flags,
    extract_effect,
    game8_label_to_id,
    merge_effect,
    normalize_effect_text,
    parse_index_move_pages,
    parse_page_identity,
)

FIXTURES = Path(__file__).resolve().parent / "testdata" / "game8"

EXTREME_BODY = (
    "Has the user charge forward with breathtaking speed. If the user performs a "
    "basic attack immediately after using this move, that attack's damage is increased. "
    "After the user learns this move, an Extreme Speed mark will be automatically "
    "applied to any nearby unmarked opposing Pokémon. This mark cannot stack, and "
    "there is a delay before the mark can be automatically applied again to the same "
    "Pokémon. If Extreme Speed hits a marked opposing Pokémon, its cooldown is reset "
    "and the user recovers HP."
)


class TestParsePageIdentity(unittest.TestCase):
    def test_move_page(self):
        html = (FIXTURES / "extreme_speed.html").read_text()
        ident = parse_page_identity(html)
        self.assertEqual(ident["kind"], "move")
        self.assertEqual(ident["move"], "Extreme Speed")
        self.assertEqual(ident["pokemon"], "Lucario")

    def test_ability_page(self):
        html = (FIXTURES / "steadfast.html").read_text()
        ident = parse_page_identity(html)
        self.assertEqual(ident["kind"], "ability")
        self.assertEqual(ident["move"], "Steadfast")
        self.assertEqual(ident["pokemon"], "Lucario")

    def test_passive_page(self):
        html = (FIXTURES / "snow_cloak.html").read_text()
        ident = parse_page_identity(html)
        self.assertEqual(ident["kind"], "ability")
        self.assertEqual(ident["move"], "Snow Cloak")
        self.assertEqual(ident["pokemon"], "Articuno")


class TestExtractEffect(unittest.TestCase):
    def test_extreme_speed_matches_in_game_body(self):
        html = (FIXTURES / "extreme_speed.html").read_text()
        body = extract_effect(html)
        self.assertEqual(body, EXTREME_BODY)
        self.assertNotIn("Upgrade", body)
        self.assertNotIn("How to Use", body)
        self.assertNotIn("Quick Attack", body)

    def test_strips_game8_upgrade_suffix(self):
        html = (FIXTURES / "extreme_speed_upgrade.html").read_text()
        body = extract_effect(html)
        self.assertEqual(body, "Has the user charge forward with breathtaking speed.")
        self.assertNotIn("Upgrade", body)
        self.assertNotIn("Also increases Attack", body)

    def test_steadfast_paraphrase_extracted_but_rejected(self):
        html = (FIXTURES / "steadfast.html").read_text()
        body = extract_effect(html)
        self.assertIn("Movement Speed", body)
        self.assertFalse(accept_ability(body))

    def test_snow_cloak_accepted_as_ability_but_flagged(self):
        html = (FIXTURES / "snow_cloak.html").read_text()
        body = extract_effect(html)
        self.assertTrue(accept_ability(body))
        self.assertIn("(0)", effect_flags(body))
        self.assertNotIn("core gameplay", body)


class TestNormalizeAndGates(unittest.TestCase):
    def test_restores_pokemon_accent(self):
        self.assertEqual(
            normalize_effect_text("opposing Pokemon it hits."),
            "opposing Pokémon it hits.",
        )

    def test_short_move_without_has_the_user_rejected(self):
        self.assertFalse(accept_move("Deals damage."))

    def test_short_has_the_user_accepted(self):
        self.assertTrue(accept_move("Has the user dash forward."))


class TestNameMap(unittest.TestCase):
    def test_explicit_aliases(self):
        self.assertEqual(game8_label_to_id("Alolan Ninetales"), "ninetales")
        self.assertEqual(game8_label_to_id("Alolan Raichu"), "raichu")
        self.assertEqual(game8_label_to_id("Galarian Rapidash"), "rapidash")
        self.assertEqual(game8_label_to_id("Mega Mewtwo X"), "mewtwox")
        self.assertEqual(game8_label_to_id("Mega Mewtwo Y"), "mewtwoy")
        self.assertEqual(game8_label_to_id("Ho-oh"), "ho-oh")
        self.assertEqual(game8_label_to_id("Mega Charizard X"), "mega-charizard-x")
        self.assertEqual(game8_label_to_id("Mr. Mime"), "mr-mime")
        self.assertEqual(game8_label_to_id("Sirfetch'd"), "sirfetchd")

    def test_unknown_returns_none(self):
        self.assertIsNone(game8_label_to_id("Not A Pokemon"))


class TestParseIndex(unittest.TestCase):
    def test_collects_move_pages_with_mapped_ids(self):
        html = (FIXTURES / "index_snippet.html").read_text()
        pages = parse_index_move_pages(html)
        by_id = {p["pokemon_id"]: p for p in pages}
        self.assertEqual(by_id["absol"]["guide_url"], "https://game8.co/games/Pokemon-UNITE/archives/335475")
        self.assertIn("https://game8.co/games/Pokemon-UNITE/archives/338101", by_id["absol"]["move_urls"])
        self.assertEqual(by_id["ninetales"]["label"], "Alolan Ninetales")
        self.assertIn("https://game8.co/games/Pokemon-UNITE/archives/338200", by_id["ninetales"]["move_urls"])


class TestMergeEffect(unittest.TestCase):
    def test_locked_ability_not_overwritten_even_if_labeled_move(self):
        archive = {"glaceon": {"snow cloak": "Has the user wrap itself in snow."}}
        status, reason = merge_effect(
            archive,
            pokemon_id="glaceon",
            key="snow cloak",
            text="Has the user wrap itself in a thick cloak of snow that opposing Pokémon cannot see through.",
            kind="move",
        )
        self.assertEqual(status, "skip")
        self.assertEqual(reason, "locked")
        self.assertEqual(archive["glaceon"]["snow cloak"], "Has the user wrap itself in snow.")
        archive = {"glaceon": {"snow cloak": "Has the user wrap itself in snow."}}
        status, reason = merge_effect(
            archive,
            pokemon_id="glaceon",
            key="snow cloak",
            text="After using a move, the Pokémon is cloaked in frost for a short time, reducing damage taken to opposing Pokémon.",
            kind="ability",
        )
        self.assertEqual(status, "skip")
        self.assertEqual(reason, "locked")
        self.assertEqual(archive["glaceon"]["snow cloak"], "Has the user wrap itself in snow.")
        self.assertIn(("glaceon", "snow cloak"), LOCKED_ABILITIES)

    def test_flagged_ability_not_applied(self):
        archive: dict = {}
        html = (FIXTURES / "snow_cloak.html").read_text()
        body = extract_effect(html)
        status, reason = merge_effect(
            archive,
            pokemon_id="articuno",
            key="snow cloak",
            text=body,
            kind="ability",
        )
        self.assertEqual(status, "skip")
        self.assertEqual(reason, "flagged")
        self.assertEqual(archive, {})

    def test_move_overwrites_unofficial_archive(self):
        archive = {"lucario": {"extreme speed": "Charges at an enemy."}}
        status, reason = merge_effect(
            archive,
            pokemon_id="lucario",
            key="extreme speed",
            text=EXTREME_BODY,
            kind="move",
        )
        self.assertEqual(status, "write")
        self.assertEqual(reason, "applied")
        self.assertEqual(archive["lucario"]["extreme speed"], EXTREME_BODY)

    def test_rejected_ability_not_applied(self):
        archive: dict = {}
        status, reason = merge_effect(
            archive,
            pokemon_id="lucario",
            key="steadfast",
            text="Lucario gains increased Movement Speed and a shield at half HP.",
            kind="ability",
        )
        self.assertEqual(status, "skip")
        self.assertEqual(reason, "ability_gate")
        self.assertEqual(archive, {})


if __name__ == "__main__":
    unittest.main()
