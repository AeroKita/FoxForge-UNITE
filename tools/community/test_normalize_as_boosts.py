"""Unit tests for attack-speed calculator name remap and manual overlays."""

from __future__ import annotations

import unittest

from normalize_as_boosts import merge_manual_moves, sheet_display_name


class TestSheetDisplayName(unittest.TestCase):
    """Mathcord sheet labels must resolve to current roster displayNames."""

    def test_regional_and_mega_aliases(self):
        self.assertEqual(sheet_display_name("Ninetales"), "Alolan Ninetales")
        self.assertEqual(sheet_display_name("Raichu"), "Alolan Raichu")
        self.assertEqual(sheet_display_name("Mewtwo Y"), "Mega Mewtwo Y")
        self.assertEqual(sheet_display_name("Gyarados [Mega]"), "Mega Gyarados")

    def test_unmapped_names_pass_through(self):
        self.assertEqual(sheet_display_name("Tsareena"), "Tsareena")
        self.assertEqual(sheet_display_name("Gyarados"), "Gyarados")


class TestMergeManualMoves(unittest.TestCase):
    """Cramorant Hurricane is a self-buff; Sableye Confuse Ray is not."""

    def test_adds_cramorant_hurricane(self):
        merged = merge_manual_moves({})
        self.assertEqual(
            merged["Cramorant"],
            [{"source": "Hurricane", "asPoints": 40.0, "minLevel": 4}],
        )

    def test_does_not_add_sableye(self):
        merged = merge_manual_moves({})
        self.assertNotIn("Sableye", merged)
