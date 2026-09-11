"""Unit tests for publish_bundle.py."""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import publish_bundle


class TestPublishBundle(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.baseline_dir = self.root / "src" / "data"
        self.public_dir = self.root / "public" / "data"
        self.baseline_dir.mkdir(parents=True)
        self.baseline = self.baseline_dir / "patch-current.json"
        self.baseline.write_text(
            json.dumps(
                {"patchVersion": "9.9.9.9", "lastUpdated": "2099-01-01", "pokemon": []},
                indent=2,
            )
            + "\n"
        )

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def _patch_paths(self):
        return mock.patch.multiple(
            publish_bundle,
            REPO=self.root,
            BASELINE=self.baseline,
            PUBLIC_DATA=self.public_dir,
            MANIFEST=self.public_dir / "manifest.json",
        )

    def test_publish_then_check_passes(self):
        with self._patch_paths():
            publish_bundle.publish()
            self.assertEqual(publish_bundle.check(), 0)
            published = self.public_dir / "patch-9.9.9.9.json"
            self.assertTrue(published.exists())
            self.assertEqual(published.read_bytes(), self.baseline.read_bytes())
            manifest = json.loads((self.public_dir / "manifest.json").read_text())
            self.assertEqual(
                manifest,
                {
                    "version": "2099-01-01",
                    "patchVersion": "9.9.9.9",
                    "url": "https://foxforge-unite.com/data/patch-9.9.9.9.json",
                },
            )

    def test_check_fails_on_manifest_drift(self):
        with self._patch_paths():
            publish_bundle.publish()
            manifest_path = self.public_dir / "manifest.json"
            manifest_path.write_text(
                json.dumps(
                    {
                        "version": "2000-01-01",
                        "patchVersion": "9.9.9.9",
                        "url": "https://foxforge-unite.com/data/patch-9.9.9.9.json",
                    },
                    indent=2,
                )
                + "\n"
            )
            rc = publish_bundle.check()
            self.assertEqual(rc, 1)


class TestRefreshHelp(unittest.TestCase):
    def test_help_lists_modes(self):
        script = Path(__file__).resolve().parent / "refresh.py"
        out = subprocess.check_output([shutil.which("python3") or "python3", str(script), "--help"], text=True)
        for mode in ("full", "curate", "clips"):
            self.assertIn(mode, out)


if __name__ == "__main__":
    unittest.main()
