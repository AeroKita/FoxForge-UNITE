"""Bundle iconAsset paths must exist as real files under public/assets."""

from __future__ import annotations

import unittest

from fetch_art import collect_asset_paths
from validate_art import missing_bundle_assets


class TestMissingBundleAssets(unittest.TestCase):
    def test_every_bundle_icon_exists_on_disk(self):
        """A new extraPassive iconAsset is a product break until fetch_art mirrors it."""
        self.assertEqual(missing_bundle_assets(), [])


SET_GLYPHS = [
    f"/assets/emblems/sets/{color}.png"
    for color in (
        "Green",
        "Yellow",
        "Red",
        "Blue",
        "White",
        "Black",
        "Brown",
        "Purple",
        "Pink",
        "Navy",
        "Gray",
    )
]


class TestSetGlyphAssets(unittest.TestCase):
    def test_collect_asset_paths_includes_set_glyphs(self):
        paths = collect_asset_paths()
        missing = [p for p in SET_GLYPHS if p not in paths]
        self.assertEqual(missing, [])
