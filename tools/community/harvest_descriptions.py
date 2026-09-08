"""Harvest Basic move/passive descriptions from the bundle into move_descriptions.json.

Archives every non-blank description the bundle currently ships so normalize.py can
backfill future upstream deletions. Upgrade-only leftovers (no body before the
Upgrade line) are treated like blank. The only programmatic writer of owned
description data.
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

from normalize import _norm_move_name, description_body

REPO = Path(__file__).resolve().parents[2]
BUNDLE = REPO / "src" / "data" / "patch-current.json"
MOVE_DESCRIPTIONS = REPO / "tools" / "community" / "move_descriptions.json"


def harvest(bundle: dict, archive: dict) -> tuple[dict, list[str]]:
    """Merge non-blank bundle descriptions into *archive* (pokemon id → norm name → text).

    Returns the updated descriptions mapping and human-readable change lines.
    Blank or upgrade-only bundle text never overwrites an existing archived value.
    """
    result: dict = copy.deepcopy(archive)
    changes: list[str] = []

    for pokemon in bundle.get("pokemon") or []:
        pid = pokemon.get("id")
        if not pid:
            continue

        bucket = result.setdefault(pid, {})
        seen_keys: dict[str, str] = {}

        entries: list[tuple[str, str, str]] = []
        for move in pokemon.get("moves") or []:
            name = move.get("name") or ""
            desc = (move.get("description") or "").strip()
            entries.append(("move", name, desc))

        passive = pokemon.get("passiveAbility") or {}
        passive_name = passive.get("name") or ""
        passive_desc = (passive.get("description") or "").strip()
        if passive_name or passive_desc:
            entries.append(("passive", passive_name, passive_desc))

        for kind, name, desc in entries:
            if not description_body(desc):
                continue
            key = _norm_move_name(name)
            if not key:
                continue

            prior_name = seen_keys.get(key)
            if prior_name is not None and prior_name != name:
                changes.append(f"! {pid}: key {key!r} collision between {prior_name!r} and {name!r}")

            seen_keys[key] = name
            old = bucket.get(key)
            if old is None:
                bucket[key] = desc
                changes.append(f"+ {pid}/{name}: archived")
            elif old != desc:
                bucket[key] = desc
                changes.append(f"~ {pid}/{name}: updated")

    return result, changes


def main() -> int:
    bundle = json.loads(BUNDLE.read_text())
    doc = json.loads(MOVE_DESCRIPTIONS.read_text())
    descriptions = doc.get("descriptions") or {}

    updated, changes = harvest(bundle, descriptions)
    for line in changes:
        print(line)

    if changes:
        doc["descriptions"] = updated
        MOVE_DESCRIPTIONS.write_text(
            json.dumps(doc, indent=2, ensure_ascii=False) + "\n"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
