"""One-shot Game8 Effect ingest into the owned Basic archive.

Not wired to refresh.py or data:harvest. Default is --dry-run. Use --write to
merge accepted Effect bodies into move_descriptions.json.

Game8 is a discovery source for in-game tooltip prose. Do not copy How to Use,
patch history, damage tables, or strategy. Do not store Game8 Upgrade text.
"""

from __future__ import annotations

import argparse
import html as html_lib
import json
import re
import ssl
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

from normalize import _norm_move_name, slugify

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
MOVE_DESCRIPTIONS = HERE / "move_descriptions.json"
DEFAULT_CACHE = HERE / "_game8_cache"

INDEX_URL = "https://game8.co/games/Pokemon-UNITE/archives/338014"
ALL_POKEMON_URL = "https://game8.co/games/Pokemon-UNITE/archives/335437"
USER_AGENT = "FoxForge-UNITE/2.5.2 one-shot archive fill (not a site mirror)"

GAME8_MOVE_NAME_ALIASES = {
    "magial leaf": "Magical Leaf",
}

GAME8_LABEL_TO_ID = {
    "alolan ninetales": "ninetales",
    "alolan raichu": "raichu",
    "galarian rapidash": "rapidash",
    "mega mewtwo x": "mewtwox",
    "mega mewtwo y": "mewtwoy",
    "ho-oh": "ho-oh",
    "mega charizard x": "mega-charizard-x",
    "mega charizard y": "mega-charizard-y",
    "mega lucario": "mega-lucario",
    "mega gyarados": "mega-gyarados",
    "mr. mime": "mr-mime",
    "sirfetch'd": "sirfetchd",
    "sirfetchd": "sirfetchd",
}

# Operator-supplied in-game Ability Basics (2026-09-08). Never overwrite.
LOCKED_ABILITIES = frozenset(
    {
        ("aegislash", "stance change"),
        ("ceruledge", "weak armor"),
        ("dragonite", "multiscale"),
        ("espeon", "magic bounce"),
        ("glaceon", "snow cloak"),
        ("gyarados", "moxie"),
        ("leafeon", "chlorophyll"),
        ("raichu", "surge surfer"),
        ("tsareena", "queenly majesty"),
        ("tyranitar", "sand stream"),
        ("umbreon", "inner focus"),
        ("urshifu", "unseen fist"),
        ("vaporeon", "water absorb"),
        ("sylveon", "pixilate"),
        ("solgaleo", "full metal body"),
        ("mega-charizard-x", "tough claws"),
        ("mega-charizard-y", "drought"),
        ("mega-lucario", "adaptability"),
        ("mega-gyarados", "mold breaker"),
    }
)

# Known FoxForge license ids used to reject invented slugs.
KNOWN_IDS: frozenset[str] | None = None

_H1_IDENT = re.compile(
    r"^(?P<move>.+?):\s*(?P<pokemon>.+?)\s+"
    r"(?P<kind>Move Effect|Passive Effect|Ability Effects?)\b",
    re.I,
)
_EFFECT_HEADING = re.compile(r"^(.+?)\s+Effect$", re.I)
_UPGRADE_TAIL = re.compile(
    r"\s+Upgrade(?:\s*\([^)]*\))?:\s*.+$",
    re.I | re.S,
)
_INGAME_ABILITY = re.compile(
    r"Has the user|the Pokémon with this Ability|When the Pokémon|"
    r"When this Pokémon|After using a move, the Pokémon|opposing Pokémon",
    re.I,
)
_ARCHIVE_HREF = re.compile(
    r"https?://game8\.co/games/Pokemon-UNITE/archives/(\d+)|"
    r"/games/Pokemon-UNITE/archives/(\d+)",
    re.I,
)
_PLACEHOLDER_ZERO = re.compile(r"\(\s*0\s*\)")
_CASE_JUNK = re.compile(r"\[:case", re.I)


def game8_label_to_id(label: str) -> str | None:
    """Map a Game8 Pokémon display label to a bundle id, or None if unknown."""
    raw = (label or "").strip()
    if not raw:
        return None
    key = raw.lower().replace("é", "e")
    if key in GAME8_LABEL_TO_ID:
        return GAME8_LABEL_TO_ID[key]
    slug = slugify(raw)
    known = _known_ids()
    if slug in known:
        return slug
    return None


def _known_ids() -> frozenset[str]:
    global KNOWN_IDS
    if KNOWN_IDS is None:
        bundle = REPO / "src" / "data" / "patch-current.json"
        if bundle.is_file():
            data = json.loads(bundle.read_text())
            KNOWN_IDS = frozenset(p["id"] for p in data.get("pokemon") or [])
        else:
            KNOWN_IDS = frozenset()
    return KNOWN_IDS


def normalize_effect_text(text: str) -> str:
    """Straight apostrophes, Pokémon spelling, collapsed whitespace, no Upgrade tail."""
    t = html_lib.unescape(text or "")
    t = t.replace("\u2019", "'").replace("\u2018", "'")
    t = t.replace("Pokemon", "Pokémon").replace("Pokémon's", "Pokémon's")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    t = t.strip()
    t = _UPGRADE_TAIL.sub("", t).strip()
    return t


def effect_flags(text: str) -> list[str]:
    """Return skip reasons for broken Game8 transcriptions."""
    flags = []
    if _PLACEHOLDER_ZERO.search(text or ""):
        flags.append("(0)")
    if _CASE_JUNK.search(text or ""):
        flags.append("[:case")
    return flags


def accept_move(text: str) -> bool:
    body = (text or "").strip()
    if not body:
        return False
    if body.startswith("Has the user"):
        return True
    return len(body) >= 40


def accept_ability(text: str) -> bool:
    body = (text or "").strip()
    if len(body) < 60:
        return False
    return bool(_INGAME_ABILITY.search(body))


class _EffectParser(HTMLParser):
    """Collect text under the first `{Name} Effect` h3 until the next heading."""

    def __init__(self) -> None:
        super().__init__()
        self._in_h1 = False
        self._in_heading = False
        self._heading_buf: list[str] = []
        self._heading_tag = ""
        self._capture = False
        self._in_p = False
        self._p_buf: list[str] = []
        self.h1 = ""
        self.paragraphs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "h1":
            self._in_h1 = True
            self._heading_buf = []
        elif tag in {"h2", "h3", "h4"}:
            if self._capture:
                self._flush_p()
                self._capture = False
            self._in_heading = True
            self._heading_tag = tag
            self._heading_buf = []
        elif tag == "p" and self._capture:
            self._flush_p()
            self._in_p = True
            self._p_buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "h1" and self._in_h1:
            self.h1 = "".join(self._heading_buf).strip()
            self._in_h1 = False
        elif tag in {"h2", "h3", "h4"} and self._in_heading:
            heading = re.sub(r"\s+", " ", "".join(self._heading_buf)).strip()
            self._in_heading = False
            if tag == "h3" and self._is_effect_heading(heading) and not self.paragraphs:
                self._capture = True
        elif tag == "p" and self._in_p:
            self._flush_p()
            self._in_p = False

    def handle_data(self, data: str) -> None:
        if self._in_h1 or self._in_heading:
            self._heading_buf.append(data)
        elif self._in_p:
            self._p_buf.append(data)

    def _flush_p(self) -> None:
        if not self._in_p:
            return
        text = normalize_effect_text("".join(self._p_buf))
        if text:
            self.paragraphs.append(text)
        self._p_buf = []
        self._in_p = False

    @staticmethod
    def _is_effect_heading(heading: str) -> bool:
        if not _EFFECT_HEADING.match(heading):
            return False
        lowered = heading.lower()
        if "effects and stats" in lowered:
            return False
        if lowered.startswith("play around"):
            return False
        if lowered.endswith("effects"):
            return False
        return True


def extract_effect(html: str) -> str:
    """Return the normalized `{Name} Effect` body, with Game8 Upgrade stripped."""
    parser = _EffectParser()
    parser.feed(html or "")
    parser._flush_p()
    body = "\n\n".join(parser.paragraphs).strip()
    return normalize_effect_text(body)


def parse_page_identity(html: str) -> dict:
    """Read kind/move/pokemon from the page h1."""
    parser = _EffectParser()
    parser.feed(html or "")
    title = parser.h1 or ""
    m = _H1_IDENT.search(title)
    if not m:
        return {"kind": "", "move": "", "pokemon": "", "title": title}
    kind_raw = m.group("kind").lower()
    kind = "move" if "move effect" in kind_raw else "ability"
    return {
        "kind": kind,
        "move": m.group("move").strip(),
        "pokemon": m.group("pokemon").strip(),
        "title": title,
    }


def parse_index_move_pages(html: str) -> list[dict]:
    """Parse 338014-style `{Name} Moves` tables into guide + move URLs."""
    sections = _split_move_sections(html)
    out: list[dict] = []
    for label, block in sections:
        pid = game8_label_to_id(label)
        if not pid:
            continue
        hrefs = _archive_urls(block)
        if not hrefs:
            continue
        guide_url, move_urls = hrefs[0], hrefs[1:]
        out.append(
            {
                "label": label,
                "pokemon_id": pid,
                "guide_url": guide_url,
                "move_urls": move_urls,
            }
        )
    return out


def _split_move_sections(html: str) -> list[tuple[str, str]]:
    parts = re.split(r"<h3[^>]*>", html or "", flags=re.I)
    sections: list[tuple[str, str]] = []
    for part in parts[1:]:
        m = re.match(r"\s*([^<]+?)\s+Moves\s*</h3>(.*)", part, re.I | re.S)
        if not m:
            continue
        label = re.sub(r"\s+", " ", m.group(1)).strip()
        rest = m.group(2)
        nxt = re.search(r"<h3\b", rest, re.I)
        block = rest[: nxt.start()] if nxt else rest
        sections.append((label, block))
    return sections


def _archive_urls(html: str) -> list[str]:
    seen: list[str] = []
    found: set[str] = set()
    for m in _ARCHIVE_HREF.finditer(html or ""):
        aid = m.group(1) or m.group(2)
        url = f"https://game8.co/games/Pokemon-UNITE/archives/{aid}"
        if url not in found:
            found.add(url)
            seen.append(url)
    return seen


def parse_all_pokemon_guides(html: str) -> list[dict]:
    """Character-guide links from Game8's List of All Pokemon page."""
    out: list[dict] = []
    seen: set[str] = set()
    for m in re.finditer(
        r"""<a[^>]+href=['"]?([^'"\s>]*Pokemon-UNITE/archives/\d+)['"]?[^>]*>(.*?)</a>""",
        html or "",
        re.I | re.S,
    ):
        href, inner = m.group(1), m.group(2)
        label = re.sub(r"<[^>]+>", "", inner)
        label = re.sub(r"\s+", " ", html_lib.unescape(label)).strip()
        label = re.sub(r"\s*Image$", "", label, flags=re.I).strip()
        if not label or label.lower() in {"list of all pokemon", "pokemon"}:
            continue
        pid = game8_label_to_id(label)
        if not pid or pid in seen:
            continue
        aid = re.search(r"archives/(\d+)", href)
        if not aid:
            continue
        seen.add(pid)
        url = href if href.startswith("http") else f"https://game8.co{href}" if href.startswith("/") else f"https://game8.co/games/Pokemon-UNITE/archives/{aid.group(1)}"
        if not url.startswith("http"):
            url = f"https://game8.co/games/Pokemon-UNITE/archives/{aid.group(1)}"
        out.append({"label": label, "pokemon_id": pid, "guide_url": url})
    return out


def parse_guide_move_urls(html: str) -> list[str]:
    """Move/Ability page links from a character guide's Moves section.

    Stops before Stats / Holowear. Does not read Ability (Passive) table text.
    """
    m = re.search(
        r"<h2[^>]*>\s*[^<]*\bMoves\s*</h2>(.*?)(?:<h2[^>]*>\s*[^<]*Stats|<h2[^>]*>\s*[^<]*Holowear|<h2[^>]*>\s*[^<]*Skins)",
        html or "",
        re.I | re.S,
    )
    block = m.group(1) if m else ""
    if not block:
        m2 = re.search(
            r"<h3[^>]*>\s*All\s+[^<]*Moves\s*</h3>(.*?)(?:<h[23]\b)",
            html or "",
            re.I | re.S,
        )
        block = m2.group(1) if m2 else ""
    return _archive_urls(block)


def merge_effect(
    archive: dict,
    *,
    pokemon_id: str,
    key: str,
    text: str,
    kind: str,
) -> tuple[str, str]:
    """Merge one Effect into *archive*. Returns (status, reason)."""
    body = normalize_effect_text(text)
    if not body:
        return "skip", "empty"
    flags = effect_flags(body)
    if flags:
        return "skip", "flagged"
    if (pokemon_id, key) in LOCKED_ABILITIES:
        return "skip", "locked"
    if kind == "ability":
        if not accept_ability(body):
            return "skip", "ability_gate"
    elif kind == "move":
        if not accept_move(body):
            return "skip", "move_gate"
    else:
        return "skip", "unknown_kind"
    bucket = archive.setdefault(pokemon_id, {})
    old = bucket.get(key)
    if old == body:
        return "skip", "unchanged"
    bucket[key] = body
    return "write", "applied"


def fetch_url(url: str, cache_dir: Path, delay: float = 0.4) -> str:
    """GET *url*, using *cache_dir*. Prefers cache. Falls back to curl on SSL errors."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    aid = re.search(r"archives/(\d+)", url)
    dest = cache_dir / f"{aid.group(1) if aid else 'page'}.html"
    if dest.is_file() and dest.stat().st_size > 0:
        return dest.read_text(encoding="utf-8", errors="replace")
    data = _http_get(url)
    dest.write_text(data, encoding="utf-8")
    if delay:
        time.sleep(delay)
    return data


def _http_get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            return resp.read().decode("utf-8", "replace")
    except (urllib.error.URLError, ssl.SSLError):
        import subprocess

        proc = subprocess.run(
            ["curl", "-sL", "-A", USER_AGENT, url],
            check=True,
            capture_output=True,
        )
        return proc.stdout.decode("utf-8", "replace")


def ingest(
    *,
    archive: dict,
    cache_dir: Path,
    delay: float = 0.4,
    fetch=fetch_url,
) -> list[str]:
    """Crawl Game8 Effect pages and merge into *archive*. Returns report lines."""
    report: list[str] = []
    index_html = fetch(INDEX_URL, cache_dir, delay)
    pages = parse_index_move_pages(index_html)
    report.append(f"index sections: {len(pages)}")

    all_html = fetch(ALL_POKEMON_URL, cache_dir, delay)
    guides = {g["pokemon_id"]: g for g in parse_all_pokemon_guides(all_html)}
    by_id = {p["pokemon_id"]: p for p in pages}
    for gid, g in guides.items():
        if gid not in by_id:
            by_id[gid] = {
                "label": g["label"],
                "pokemon_id": gid,
                "guide_url": g["guide_url"],
                "move_urls": [],
            }
            pages.append(by_id[gid])
            report.append(f"+ extra license from all-pokemon list: {gid}")

    queued: list[tuple[str, str]] = []
    seen_urls: set[str] = set()
    for page in pages:
        pid = page["pokemon_id"]
        for url in page.get("move_urls") or []:
            if url not in seen_urls:
                seen_urls.add(url)
                queued.append((pid, url))
        guide_url = page.get("guide_url")
        if guide_url:
            try:
                guide_html = fetch(guide_url, cache_dir, delay)
            except Exception as exc:  # noqa: BLE001 — one-shot crawl continues
                report.append(f"! guide fetch {pid}: {exc}")
                continue
            for url in parse_guide_move_urls(guide_html):
                if url == guide_url or url in seen_urls:
                    continue
                # Skip obvious non-effect pages by id range only after fetch.
                seen_urls.add(url)
                queued.append((pid, url))

    report.append(f"queued pages: {len(queued)}")
    for pid_hint, url in queued:
        try:
            html = fetch(url, cache_dir, delay)
        except Exception as exc:  # noqa: BLE001
            report.append(f"! fetch {url}: {exc}")
            continue
        ident = parse_page_identity(html)
        if not ident.get("kind"):
            report.append(f"- skip {url}: not an Effect page ({ident.get('title', '')[:60]})")
            continue
        pid = game8_label_to_id(ident["pokemon"]) or pid_hint
        if not pid:
            report.append(f"- skip {url}: unknown Pokémon {ident['pokemon']!r}")
            continue
        if pid != pid_hint and pid_hint:
            # Mega / regional pages may be linked from another license; trust h1.
            pass
        move_name = GAME8_MOVE_NAME_ALIASES.get(ident["move"].lower(), ident["move"])
        key = _norm_move_name(move_name)
        body = extract_effect(html)
        status, reason = merge_effect(
            archive,
            pokemon_id=pid,
            key=key,
            text=body,
            kind=ident["kind"],
        )
        mark = "+" if status == "write" else "-"
        report.append(f"{mark} {pid}/{key}: {status} ({reason})")
    return report


def _source_blurb() -> str:
    return (
        "Move Basic descriptions — owned, hand-maintained data. Game8 Effect "
        "headings were used as a one-time transcription aid for in-game tooltip "
        "prose (not a live source; the ingest script is not part of harvest/"
        "refresh). Originally also sourced from serebii.net/pokemonunite "
        "(scraper retired). normalize.py prefers this archive over UNITE-DB "
        "Basic when a real body is present, keyed by pokemon id -> normalized "
        "move name (lowercase; trailing parenthetical/apostrophes stripped) -> "
        "Basic-tier text. Upgrade paragraphs on Basic are kept when present; "
        "normalize does not replace an existing Basic Upgrade with Advanced."
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Merge into move_descriptions.json")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Report only (default)",
    )
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--delay", type=float, default=0.4)
    args = parser.parse_args(argv)
    dry = not args.write

    doc = json.loads(MOVE_DESCRIPTIONS.read_text(encoding="utf-8"))
    archive = doc.get("descriptions") or {}
    working = json.loads(json.dumps(archive))
    report = ingest(archive=working, cache_dir=args.cache_dir, delay=args.delay)
    for line in report:
        print(line)

    if dry:
        print(f"(dry-run) {sum(1 for l in report if l.startswith('+'))} writes not saved")
        return 0

    doc["descriptions"] = working
    doc["_source"] = _source_blurb()
    MOVE_DESCRIPTIONS.write_text(
        json.dumps(doc, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {MOVE_DESCRIPTIONS}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
