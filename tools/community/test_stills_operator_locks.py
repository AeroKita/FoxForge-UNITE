"""Folders with tooltip stills must lock in-game Basic for every listed skill."""

from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

from normalize import (
    _is_basic_attack_archive_key,
    _norm_move_name,
    description_body,
    load_operator_locks,
)

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
STILLS = REPO / "screenshot-references" / "move-descriptions"
ARCHIVE = HERE / "move_descriptions.json"
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".heic", ".gif"}
SKILL_ROW = re.compile(r"→\s+(.+?)\s+\[")


def _folder_has_stills(folder: Path) -> bool:
    for path in folder.iterdir():
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES:
            return True
    return False


def _skills_from_checklist(skills_txt: Path) -> list[str]:
    keys: list[str] = []
    for line in skills_txt.read_text(encoding="utf-8").splitlines():
        match = SKILL_ROW.search(line)
        if not match:
            continue
        key = _norm_move_name(match.group(1))
        if not key or _is_basic_attack_archive_key(key):
            continue
        keys.append(key)
    return keys


class TestStillsOperatorLocks(unittest.TestCase):
    def test_stills_folders_lock_every_listed_skill_with_a_real_body(self):
        """Each stills folder's SKILLS.txt rows must be locked with archive bodies."""
        archive = json.loads(ARCHIVE.read_text(encoding="utf-8"))
        descriptions = archive.get("descriptions") or archive
        locks = load_operator_locks()
        missing: list[str] = []
        for folder in sorted(p for p in STILLS.iterdir() if p.is_dir()):
            if not _folder_has_stills(folder):
                continue
            skills_txt = folder / "SKILLS.txt"
            if not skills_txt.is_file():
                missing.append(f"{folder.name}: missing SKILLS.txt")
                continue
            locked = locks.get(folder.name) or frozenset()
            bucket = descriptions.get(folder.name) or {}
            for key in _skills_from_checklist(skills_txt):
                if key not in locked:
                    missing.append(f"{folder.name}/{key}: not locked")
                elif not description_body(bucket.get(key) or ""):
                    missing.append(f"{folder.name}/{key}: locked but no archive body")
        self.assertEqual(missing, [])
