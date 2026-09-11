"""Validate every file under public/assets is a real image (not HTML/truncated).

Also fail when the bundle points at an icon that was never mirrored (new extra
Passives after curate are the usual miss — run fetch_art.py).

Usage:  python3 validate_art.py
"""

from __future__ import annotations

import sys
import urllib.parse
from pathlib import Path

# Re-use the same rules as fetch_art.py (single source of truth).
sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_art import PUBLIC, collect_asset_paths, is_valid_image  # noqa: E402


def missing_bundle_assets() -> list[str]:
    """Return bundle ``/assets/...`` paths that are absent or not valid images."""
    missing: list[str] = []
    for asset_path in sorted(collect_asset_paths()):
        rel = asset_path[len("/assets/") :]
        dest = PUBLIC / urllib.parse.unquote(rel)
        if not is_valid_image(dest):
            missing.append(asset_path)
    return missing


def main() -> None:
    if not PUBLIC.exists():
        print(f"ERROR: {PUBLIC} does not exist")
        raise SystemExit(1)
    bad: list[str] = []
    total = 0
    for fp in sorted(PUBLIC.rglob("*")):
        if fp.suffix.lower() in {".mp4", ".webm"}:
            continue
        if fp.is_file():
            total += 1
            if not is_valid_image(fp):
                bad.append(str(fp.relative_to(PUBLIC)))
    if bad:
        print(f"INVALID: {len(bad)} / {total} asset files")
        for p in bad:
            print(f"  {p}")
        raise SystemExit(1)
    missing = missing_bundle_assets()
    if missing:
        print(f"MISSING: {len(missing)} bundle iconAsset paths have no file")
        for p in missing:
            print(f"  {p}")
        print("→ run: python3 tools/community/fetch_art.py")
        raise SystemExit(1)
    print(f"OK: {total} asset files validated")


if __name__ == "__main__":
    main()
