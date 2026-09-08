"""Mirror fandom move/passive animation GIFs as scaled animated WebP into
public/assets, and record a manifest (tools/community/move_gifs.json) mapping
each Pokémon's moves to the local asset path. Only ~13 Pokémon have GIFs on
fandom; the app falls back to the static skill icon for the rest.

Usage:  python3 fetch_gifs.py
"""
from __future__ import annotations
import json, re, subprocess, urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent.parent
BUNDLE = PROJECT / "src" / "data" / "patch-current.json"
PUBLIC = PROJECT / "public" / "assets"
OUT = HERE / "move_gifs.json"
API = "https://pokemonunite.fandom.com/api.php"
WIDTH = 180  # fandom serves an animated WebP at this scaled width
UA = "FoxForge-UNITE art mirror (non-commercial; github.com/AeroKita/FoxForge-UNITE)"
PAGE_ALIASES = {
    "Mega Charizard X": "Charizard", "Mega Charizard Y": "Charizard",
    "Mega Gyarados": "Gyarados", "Mega Lucario": "Lucario",
    "Mega Mewtwo X": "Mewtwo", "Mega Mewtwo Y": "Mewtwo",
}

def api(params: dict) -> dict:
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    out = subprocess.run(["curl", "-sSL", "-A", UA, "--max-time", "30", url],
                         capture_output=True).stdout
    return json.loads(out or b"{}")

def page_gifs(title: str) -> list[str] | None:
    d = api({"action": "query", "titles": title, "prop": "images",
             "imlimit": "500", "redirects": "1"})
    page = next(iter(d.get("query", {}).get("pages", {}).values()), {})
    if "missing" in page:
        return None
    return [im["title"][5:] for im in page.get("images", [])
            if im["title"].lower().endswith(".gif")]

def thumb_url(file_title: str) -> str | None:
    d = api({"action": "query", "titles": "File:" + file_title,
             "prop": "imageinfo", "iiprop": "url", "iiurlwidth": str(WIDTH)})
    page = next(iter(d.get("query", {}).get("pages", {}).values()), {})
    ii = page.get("imageinfo")
    return (ii[0].get("thumburl") or ii[0].get("url")) if ii else None

def move_name_of(gif_title: str) -> str:
    base = gif_title[:-4]                       # strip ".gif"
    base = base.split(" - ")[0]                 # strip " - <Pokémon>"
    return re.sub(r"\s*\([^)]*\)\s*$", "", base) # strip trailing "(...)"

def norm(s: str) -> str:
    return s.lower().replace("'", "").replace("-", " ").replace(".", "").strip()

def is_webp(p: Path) -> bool:
    d = p.read_bytes()[:12] if p.exists() else b""
    return d[:4] == b"RIFF" and d[8:12] == b"WEBP"

def download(url: str, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(["curl", "-sSL", "--fail", "-A", UA, "--retry", "3",
                        "--max-time", "120", "-o", str(dest), url], capture_output=True)
    if r.returncode == 0 and is_webp(dest):
        return True
    dest.unlink(missing_ok=True)
    return False

def main() -> None:
    bundle = json.loads(BUNDLE.read_text())
    manifest: dict[str, dict[str, str]] = {}
    page_cache: dict[str, list[str] | None] = {}
    misses: list[str] = []
    for p in bundle["pokemon"]:
        title = PAGE_ALIASES.get(p["displayName"], p["displayName"])
        gifs = page_cache.get(title)
        if title not in page_cache:
            gifs = page_gifs(title); page_cache[title] = gifs
        if not gifs:
            continue
        by_move = {norm(move_name_of(g)): g for g in gifs}
        entries: list[tuple[dict, str]] = [(m, m["name"]) for m in p["moves"]
                                           if m.get("slot") != "basicAttack" and m.get("iconAsset")]
        pa = p.get("passiveAbility") or {}
        if pa.get("iconAsset"):
            entries.append((pa, pa["name"]))
        for extra in p.get("extraPassives") or []:
            if extra.get("iconAsset"):
                entries.append((extra, extra["name"]))
        for obj, name in entries:
            gif_title = by_move.get(norm(name))
            if not gif_title:
                continue
            url = thumb_url(gif_title)
            if not url:
                misses.append(f"{p['id']}:{name} (no thumburl)"); continue
            asset_path = re.sub(r"\.png$", ".webp", obj["iconAsset"])  # /assets/skills/<Folder>/<Move>.webp
            dest = PUBLIC / urllib.parse.unquote(asset_path[len("/assets/"):])
            if dest.exists() and is_webp(dest) or download(url, dest):
                manifest.setdefault(p["id"], {})[norm(name)] = asset_path
            else:
                misses.append(f"{p['id']}:{name} (download failed)")
    OUT.write_text(json.dumps({"_source": "pokemonunite.fandom.com",
                               "_width": WIDTH, "gifs": manifest}, indent=2, ensure_ascii=False) + "\n")
    got = sum(len(v) for v in manifest.values())
    print(f"wrote {OUT}: {got} gifs across {len(manifest)} pokemon")
    for m in misses:
        print("  miss:", m)

if __name__ == "__main__":
    main()
