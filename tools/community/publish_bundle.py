"""Publish src/data/patch-current.json to public/data/ (version-stamped copy + manifest).

Single source of truth for the two-copy mirror used locally and in CI.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
BASELINE = REPO / "src" / "data" / "patch-current.json"
PUBLIC_DATA = REPO / "public" / "data"
MANIFEST = PUBLIC_DATA / "manifest.json"
BASE_URL = "https://foxforge-unite.com/data"


def _load_baseline() -> tuple[str, str]:
    data = json.loads(BASELINE.read_text())
    return data["patchVersion"], data["lastUpdated"]


def _expected_manifest(patch: str, ver: str) -> dict:
    return {
        "version": ver,
        "patchVersion": patch,
        "url": f"{BASE_URL}/patch-{patch}.json",
    }


def publish() -> None:
    patch, ver = _load_baseline()
    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    for old in PUBLIC_DATA.glob("patch-*.json"):
        old.unlink()
    dest = PUBLIC_DATA / f"patch-{patch}.json"
    shutil.copy2(BASELINE, dest)
    MANIFEST.write_text(json.dumps(_expected_manifest(patch, ver), indent=2) + "\n")
    print(f"published patch-{patch}.json + manifest (version {ver})")


def check() -> int:
    patch, ver = _load_baseline()
    dest = PUBLIC_DATA / f"patch-{patch}.json"
    errors: list[str] = []

    if not dest.exists():
        errors.append(f"missing {dest.relative_to(REPO)}")
    elif dest.read_bytes() != BASELINE.read_bytes():
        errors.append(
            f"{dest.relative_to(REPO)} is not byte-identical to "
            f"{BASELINE.relative_to(REPO)}"
        )

    if not MANIFEST.exists():
        errors.append(f"missing {MANIFEST.relative_to(REPO)}")
    else:
        manifest = json.loads(MANIFEST.read_text())
        expected = _expected_manifest(patch, ver)
        for key, want in expected.items():
            got = manifest.get(key)
            if got != want:
                errors.append(f"manifest.json {key!r}: got {got!r}, want {want!r}")

    if errors:
        for msg in errors:
            print(f"✗ {msg}")
        print("→ run: npm run data:publish")
        return 1
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish or verify the public/data bundle mirror.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify published copy matches baseline without writing",
    )
    args = parser.parse_args()
    if args.check:
        sys.exit(check())
    publish()


if __name__ == "__main__":
    main()
