"""Gate: no Serebii scrape, ingest, or host fetch may live in the data pipeline.

Operator in-game Basic in move_descriptions.json is the archive source of
truth. This module must not mention live Serebii URLs so a self-scan stays clean.
"""

from __future__ import annotations

import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
SCRAPE_NAME = "scrape_serebii.py"
SCRAPE_TEST_NAME = "test_scrape_serebii.py"
SCRAPE_MARKER = "scrape_serebii"
HOST_MARKER = "serebii.net"


class TestNoSerebiiPipeline(unittest.TestCase):
    def test_scrape_script_is_absent(self):
        """The former Serebii scraper must not exist — even as add-only."""
        self.assertFalse((HERE / SCRAPE_NAME).exists())

    def test_scrape_tests_are_absent(self):
        self.assertFalse((HERE / SCRAPE_TEST_NAME).exists())

    def test_community_python_does_not_talk_to_serebii(self):
        """No community script may fetch or merge from that host."""
        hits: list[str] = []
        for path in HERE.glob("*.py"):
            if path.name == Path(__file__).name or path.name.startswith("test_"):
                continue
            text = path.read_text(encoding="utf-8")
            lowered = text.lower()
            if HOST_MARKER in lowered or SCRAPE_MARKER in text or "serebii" in lowered:
                hits.append(path.name)
        self.assertEqual(hits, [])

    def test_refresh_and_npm_do_not_wire_serebii(self):
        refresh = (HERE / "refresh.py").read_text(encoding="utf-8")
        package = (REPO / "package.json").read_text(encoding="utf-8")
        self.assertNotIn(SCRAPE_MARKER, refresh)
        self.assertNotIn(HOST_MARKER, refresh)
        self.assertNotIn(SCRAPE_MARKER, package)
        self.assertNotIn(HOST_MARKER, package)

    def test_repo_executables_do_not_talk_to_serebii(self):
        """No script outside this gate may name the host or the scraper."""
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
            if path.name.startswith("test_") or path.name.endswith(".test.ts") or path.name.endswith(".test.tsx"):
                continue
            if "__tests__" in path.parts:
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            lowered = text.lower()
            if HOST_MARKER in lowered or SCRAPE_MARKER in text or "serebii" in lowered:
                hits.append(str(path.relative_to(REPO)))
        self.assertEqual(hits, [])
