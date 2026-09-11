"""Bundle iconAsset paths must exist as real files under public/assets."""

from __future__ import annotations

import unittest

from validate_art import missing_bundle_assets


class TestMissingBundleAssets(unittest.TestCase):
    def test_every_bundle_icon_exists_on_disk(self):
        """A new extraPassive iconAsset is a product break until fetch_art mirrors it."""
        self.assertEqual(missing_bundle_assets(), [])
