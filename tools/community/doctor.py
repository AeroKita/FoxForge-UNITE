"""Environment preflight for FoxForge UNITE data pipeline maintainers."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
NODE_VERSION_FILE = REPO / ".node-version"
VENV_PY = REPO / "tools" / "extract" / ".venv" / "bin" / "python3"
RAW = REPO / "tools" / "community" / "_raw"
VENV_SETUP = (
    "python3 -m venv tools/extract/.venv && "
    "tools/extract/.venv/bin/pip install -r tools/community/requirements.txt"
)


def _node_major() -> int | None:
    try:
        out = subprocess.check_output(["node", "--version"], text=True).strip()
        return int(out.lstrip("v").split(".")[0])
    except (FileNotFoundError, subprocess.CalledProcessError, ValueError):
        return None


def _required_node_major() -> int:
    return int(NODE_VERSION_FILE.read_text().strip())


def node_version_hint(required_major: int) -> str:
    """Return a one-line install hint when Node is missing or too old.

    Prefer NVM + the repo ``.nvmrc`` so maintainers (and agents) do not need
    Homebrew PATH overrides.
    """
    return (
        f"  hint: install NVM (https://github.com/nvm-sh/nvm), then from the repo root: "
        f"nvm install && nvm use  # reads .nvmrc (Node {required_major})"
    )


def _venv_deps_ok() -> bool:
    if not VENV_PY.exists():
        return False
    try:
        subprocess.check_call(
            [str(VENV_PY), "-c", "import requests, openpyxl"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True
    except subprocess.CalledProcessError:
        return False


def _raw_nonempty() -> bool:
    return RAW.is_dir() and any(RAW.iterdir())


def main() -> None:
    required_node = _required_node_major()
    node_major = _node_major()
    hard_fail = False
    warnings: list[str] = []

    if node_major is None:
        print(f"✗ Node.js not found (need major ≥ {required_node})")
        print(node_version_hint(required_node))
        hard_fail = True
    elif node_major < required_node:
        print(f"✗ Node.js v{node_major} (need major ≥ {required_node})")
        print(node_version_hint(required_node))
        hard_fail = True
    else:
        print(f"✓ Node.js major {node_major} (≥ {required_node})")

    if not VENV_PY.exists():
        print(f"✗ Python venv missing at {VENV_PY.relative_to(REPO)}")
        print(f"  setup: {VENV_SETUP}")
        hard_fail = True
    elif not _venv_deps_ok():
        print("✗ venv missing requests/openpyxl")
        print(f"  setup: {VENV_SETUP}")
        hard_fail = True
    else:
        print("✓ Python venv with requests + openpyxl")

    if shutil.which("ffmpeg") and shutil.which("ffprobe"):
        print("✓ ffmpeg + ffprobe on PATH")
    else:
        warnings.append("ffmpeg/ffprobe not on PATH (needed for move clips) — brew install ffmpeg")

    if _raw_nonempty():
        print("✓ _raw/ present and non-empty")
    else:
        warnings.append("_raw/ missing or empty (run fetch.py before normalize)")

    for w in warnings:
        print(f"⚠ {w}")

    if hard_fail:
        print("✗ Environment not ready for data work")
        sys.exit(1)
    if warnings:
        print("✓ Environment ready (with warnings above)")
    else:
        print("✓ Environment ready for data work")


if __name__ == "__main__":
    main()
