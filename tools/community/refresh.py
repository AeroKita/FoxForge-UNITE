"""One-command orchestrator for the FoxForge UNITE data pipeline."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Callable

REPO = Path(__file__).resolve().parents[2]
COMMUNITY = REPO / "tools" / "community"
VENV_PY = REPO / "tools" / "extract" / ".venv" / "bin" / "python3"
SYSTEM_PY = shutil.which("python3") or "python3"


def run(label: str, cmd: list[str], *, cwd: Path | None = None, env: dict | None = None) -> int:
    print(f"▶ {label}")
    merged = os.environ.copy()
    if env:
        merged.update(env)
    result = subprocess.run(cmd, cwd=cwd or REPO, env=merged)
    if result.returncode != 0:
        print(f"✗ {label} failed (exit {result.returncode}) — fix and re-run")
    return result.returncode


def venv_py() -> str:
    return str(VENV_PY) if VENV_PY.exists() else SYSTEM_PY


def run_doctor() -> int:
    return run("doctor", [SYSTEM_PY, str(COMMUNITY / "doctor.py")])


def run_fetch() -> int:
    return run("fetch", [venv_py(), str(COMMUNITY / "fetch.py")])


def run_transcode() -> int:
    if not shutil.which("ffprobe"):
        print("⚠ ffprobe missing — skipping transcode_clips (clips optional)")
        return 0
    return run("transcode_clips", [venv_py(), str(COMMUNITY / "transcode_clips.py")])


def run_normalize(patch_version: str | None) -> int:
    env = {}
    if patch_version:
        env["PATCH_VERSION"] = patch_version
    return run("normalize", [venv_py(), str(COMMUNITY / "normalize.py")], env=env or None)


def run_generate_presets() -> int:
    return run("generate:presets", ["npm", "run", "generate:presets"])


def run_harvest() -> int:
    return run("harvest_descriptions", [SYSTEM_PY, str(COMMUNITY / "harvest_descriptions.py")])


def run_fetch_art() -> int:
    return run("fetch_art", [venv_py(), str(COMMUNITY / "fetch_art.py")])


def run_normalize_as_boosts() -> int:
    return run("normalize_as_boosts", [venv_py(), str(COMMUNITY / "normalize_as_boosts.py")])


def run_publish() -> int:
    return run("publish", [SYSTEM_PY, str(COMMUNITY / "publish_bundle.py")])


def run_verify() -> int:
    return run("verify", ["npm", "run", "verify"])


def run_mode(
    mode: str,
    *,
    patch_version: str | None,
    skip_verify: bool,
    skip_art: bool,
) -> int:
    steps: list[tuple[str, Callable[[], int]]] = []

    if mode == "full":
        steps = [
            ("doctor", lambda: run_doctor()),
            ("fetch", lambda: run_fetch()),
            ("transcode_clips", lambda: run_transcode()),
            ("normalize", lambda: run_normalize(patch_version)),
            ("generate:presets", lambda: run_generate_presets()),
            ("harvest_descriptions", lambda: run_harvest()),
        ]
        if not skip_art:
            steps.append(("fetch_art", lambda: run_fetch_art()))
        steps.extend(
            [
                ("normalize_as_boosts", lambda: run_normalize_as_boosts()),
                ("publish", lambda: run_publish()),
            ]
        )
    elif mode == "curate":
        steps = [
            ("normalize", lambda: run_normalize(patch_version)),
            ("generate:presets", lambda: run_generate_presets()),
            ("publish", lambda: run_publish()),
        ]
    elif mode == "clips":
        steps = [
            ("transcode_clips", lambda: run_transcode()),
            ("normalize", lambda: run_normalize(patch_version)),
            ("publish", lambda: run_publish()),
        ]
    else:
        print(f"unknown mode {mode!r}")
        return 2

    if not skip_verify:
        steps.append(("verify", lambda: run_verify()))

    for _, fn in steps:
        if fn() != 0:
            return 1
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the FoxForge UNITE data pipeline in one command.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Modes:
  full          (default) doctor → fetch → transcode → normalize →
                presets → harvest → fetch_art → boosts → publish → verify
  curate        normalize → presets → publish → verify (after curated_builds edits)
  clips         transcode → normalize → publish → verify
""",
    )
    parser.add_argument(
        "--mode",
        choices=("full", "curate", "clips"),
        default="full",
        help="pipeline subset to run (default: full)",
    )
    parser.add_argument(
        "--patch-version",
        help="PATCH_VERSION env for normalize.py (new patch id)",
    )
    parser.add_argument(
        "--no-verify",
        action="store_true",
        help="skip the final npm run verify",
    )
    parser.add_argument(
        "--skip-art",
        action="store_true",
        help="full mode only: skip fetch_art.py",
    )
    args = parser.parse_args()
    sys.exit(
        run_mode(
            args.mode,
            patch_version=args.patch_version,
            skip_verify=args.no_verify,
            skip_art=args.skip_art,
        )
    )


if __name__ == "__main__":
    main()
