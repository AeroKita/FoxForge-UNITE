"""Gate: no Game8 crawl, ingest, or cache may live in the data pipeline.

Operator in-game Basic in move_descriptions.json is the archive source of
truth. This module must not mention live Game8 URLs so a self-scan stays clean.
"""

from __future__ import annotations

import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
INGEST_NAME = "ingest_game8_effects.py"
INGEST_TEST_NAME = "test_ingest_game8_effects.py"
CACHE_DIR_NAME = "_game8_cache"
HOST_MARKER = "game8.co"
INGEST_MARKER = "ingest_game8"


class TestNoGame8Pipeline(unittest.TestCase):
    def test_ingest_script_is_absent(self):
        """The former Effect ingest must not exist — even as add-only."""
        self.assertFalse((HERE / INGEST_NAME).exists())

    def test_ingest_tests_and_fixtures_are_absent(self):
        """Fixtures that taught the crawler how to parse Game8 HTML must go."""
        self.assertFalse((HERE / INGEST_TEST_NAME).exists())
        self.assertFalse((HERE / "testdata" / "game8").exists())

    def test_community_python_does_not_talk_to_game8(self):
        """No community script may fetch or merge from that host."""
        hits: list[str] = []
        for path in HERE.glob("*.py"):
            if path.name == Path(__file__).name:
                continue
            text = path.read_text(encoding="utf-8")
            if HOST_MARKER in text or INGEST_MARKER in text or CACHE_DIR_NAME in text:
                hits.append(path.name)
        self.assertEqual(hits, [])

    def test_refresh_and_npm_do_not_wire_game8(self):
        """refresh.py and package.json must not name the ingest."""
        refresh = (HERE / "refresh.py").read_text(encoding="utf-8")
        package = (REPO / "package.json").read_text(encoding="utf-8")
        self.assertNotIn(INGEST_MARKER, refresh)
        self.assertNotIn(HOST_MARKER, refresh)
        self.assertNotIn(INGEST_MARKER, package)
        self.assertNotIn(HOST_MARKER, package)

    def test_gitignore_has_no_game8_cache(self):
        """A cache path implies a crawler. Do not keep a slot for one."""
        gitignore = (REPO / ".gitignore").read_text(encoding="utf-8")
        self.assertNotIn(CACHE_DIR_NAME, gitignore)
        self.assertNotIn(HOST_MARKER, gitignore)

    def test_game8_cache_dir_is_absent(self):
        """Leftover crawled HTML must not stay on disk."""
        self.assertFalse((HERE / CACHE_DIR_NAME).exists())

    def test_repo_executables_do_not_talk_to_game8(self):
        """No script outside this gate may name the host or the ingest."""
        skip_dirs = {"node_modules", "dist", "dev-dist", ".git", ".venv", "__pycache__"}
        hits: list[str] = []
        for path in REPO.rglob("*"):
            if not path.is_file():
                continue
            if any(part in skip_dirs for part in path.parts):
                continue
            if path.name == Path(__file__).name:
                continue
            if path.suffix not in {".py", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".sh"}:
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            if HOST_MARKER in text or INGEST_MARKER in text or CACHE_DIR_NAME in text:
                hits.append(str(path.relative_to(REPO)))
        self.assertEqual(hits, [])
