"""Normalize UNITE-DB raw JSON into a GameDataBundle (src/data/patch-current.json).

Maps UNITE-DB's shapes onto schema/types.ts. Conventions applied here:
  - Percentages become decimals (crit 20 -> 0.20, attack_speed 40 -> 0.40).
  - Held-item flats are emitted for every grade 1–40 (the in-game cap is 40),
    via the formula recovered from UNITE-DB's params:
      value = increment * factor(level) / (skip + 1) + initial_diff,
    where factor(g) = g for g <= 30 and 30 + (g - 30)/2 for g > 30
    (so Curse Bangle Attack = 24 at G30, 28 at G40).
  - Emblem grades A/B/C map to gold/silver/bronze (A = best = gold).
  - Art is referenced from UNITE-DB's CloudFront CDN (case-sensitive names).

Provenance: the whole bundle is community-sourced from UNITE-DB; this is recorded
in the bundle's `dataSource` block (the APK bundles are encrypted — see
tools/extract/ENCRYPTION-FINDINGS.md).

Usage:  python3 normalize.py
"""

from __future__ import annotations

import copy
import json
import os
import re
import unicodedata
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW = HERE / "_raw"
OUT = HERE.parent.parent / "src" / "data" / "patch-current.json"
CDN = "https://d275t8dp8rxb42.cloudfront.net"
ASSETS = "/assets"  # local mirror under public/assets (see fetch_art.py)


def _read_previous_patch_version(fallback: str = "1.23.2.8") -> str:
    """Carry forward patchVersion from the existing bundle when PATCH_VERSION is unset."""
    if OUT.exists():
        try:
            bundle = json.loads(OUT.read_text())
            if v := bundle.get("patchVersion"):
                return str(v)
        except (json.JSONDecodeError, OSError):
            pass
    return fallback


PATCH_VERSION = os.environ.get("PATCH_VERSION") or _read_previous_patch_version()

# Unite-move unlock levels missing from UNITE-DB raw (slug -> level).
MANUAL_LEVEL = {"psykaboom": 9}

# ---- helpers ---------------------------------------------------------------

ROLE_MAP = {
    "All-Rounder": "AllRounder",
    "Attacker": "Attacker",
    "Speedster": "Speedster",
    "Defender": "Defender",
    "Supporter": "Supporter",
}
DIFFICULTY_MAP = {"Novice": 1, "Intermediate": 2, "Expert": 3}
COLOR_MAP = {
    "Brown": "brown", "Green": "green", "Blue": "blue", "Purple": "purple",
    "White": "white", "Red": "red", "Yellow": "yellow", "Black": "black",
    "Pink": "pink", "Navy": "navy", "Gray": "gray",
}
GRADE_MAP = {"A": "gold", "B": "silver", "C": "bronze"}

# Flat (non-percent) StatBlock fields.
FLAT_FIELDS = {"hp", "attack", "defense", "spAttack", "spDefense", "moveSpeed"}


def load(name: str):
    return json.loads((RAW / f"{name}.json").read_text())


def num(x, default=0.0) -> float:
    if x is None or x == "":
        return default
    try:
        return float(x)
    except (TypeError, ValueError):
        return default


# UNITE-DB stat label -> (StatBlock field, is_percent). Labels appear across
# stats.json, held items, emblems and emblem sets (with abbreviations).
STAT_FIELD = {
    "hp": ("hp", False), "HP": ("hp", False),
    "attack": ("attack", False), "Attack": ("attack", False), "Atk": ("attack", False),
    "defense": ("defense", False), "Defense": ("defense", False),
    "sp_attack": ("spAttack", False), "Sp. Attack": ("spAttack", False),
    "sp_defense": ("spDefense", False), "Sp. Defense": ("spDefense", False),
    "crit": ("critRate", True), "Crit": ("critRate", True),
    "Critical-Hit Rate": ("critRate", True),
    "cdr": ("cdr", True), "CDR": ("cdr", True), "CD Reduction": ("cdr", True),
    "lifesteal": ("lifesteal", True),
    "attack_speed": ("attackSpeed", True), "Attack Speed": ("attackSpeed", True),
    "AS": ("attackSpeed", True),
    "speed": ("moveSpeed", False), "Speed": ("moveSpeed", False),
    "move_speed": ("moveSpeed", False), "Movement Speed": ("moveSpeed", False),
}


def map_stat(label: str, value: float):
    """Return (field, decimal_value) or None if the label has no StatBlock field."""
    entry = STAT_FIELD.get(label)
    if entry is None:
        return None
    field, is_percent = entry
    return field, (value / 100.0 if is_percent else value)


# ---- pokemon ---------------------------------------------------------------

DMG_TYPE = {"Atk": "physical", "SpAtk": "special", "Sp. Atk": "special", "True": "true"}
SCALING = {"Atk": "attack", "SpAtk": "spAttack", "Sp. Atk": "spAttack",
           "True": "none", "Max HP": "maxHp"}
SLOT_MAP = {"Basic": "basicAttack", "Move 1": "move1", "Move 2": "move2",
            "Unite": "uniteMove", "Unite Move": "uniteMove"}


def stat_block(level_row: dict) -> dict:
    """UNITE-DB stats.json level row -> full StatBlock (decimals for %)."""
    return {
        "hp": num(level_row.get("hp")),
        "attack": num(level_row.get("attack")),
        "defense": num(level_row.get("defense")),
        "spAttack": num(level_row.get("sp_attack")),
        "spDefense": num(level_row.get("sp_defense")),
        "critRate": num(level_row.get("crit")) / 100.0,
        "cdr": num(level_row.get("cdr")) / 100.0,
        "lifesteal": num(level_row.get("lifesteal")) / 100.0,
        "spLifesteal": 0.0,
        "attackSpeed": num(level_row.get("attack_speed")) / 100.0,
        "moveSpeed": num(level_row.get("move_speed")),
    }


def damage_instances(rsb: dict) -> list:
    """Extract the primary + add1..add5 damage instances from a skill rsb block."""
    out = []
    groups = [("ratio", "dmg_type", "slider", "base")]
    groups += [(f"add{i}_ratio", f"add{i}_dmg_type", f"add{i}_slider", f"add{i}_base")
               for i in range(1, 6)]
    for rk, dk, sk, bk in groups:
        if not rsb.get(rk):
            continue
        dt = rsb.get(dk, "")
        out.append({
            "ratio": num(rsb.get(rk)) / 100.0,
            "scalingStat": SCALING.get(dt, "none"),
            "slider": num(rsb.get(sk)),
            "base": num(rsb.get(bk)),
            "damageType": DMG_TYPE.get(dt, "true"),
        })
    return out


# Display rewording for UNITE-DB `add{N}_label` strings. Raw labels are
# datamine-flavored ("Damage - Execute", "Shield - Additional"); this maps each
# label seen in the data to user-facing phrasing. Unknown (future) labels pass
# through verbatim via reword_add_label so secondary values always render
# labeled, never as context-free floating paragraphs.
ADD_LABEL_REWORDS = {
    "Shield - Additional": "Shield",
    "Heal": "Healing",
    "Heal (Over 3s)": "Healing (over 3s)",
    "Healing (Per Tick)": "Healing (per tick)",
    "Healing (2x)": "Healing (2×)",
    "Healing (4x)": "Healing (4×)",
    "Healing - Additional": "Additional healing",
    "Healing - Oran Berry": "Healing (Oran Berry)",
    "Healing - After Eating Any Berry": "Healing (any berry)",
    "Healing (Per hit up to 4x based on number of Center hits)":
        "Healing (per hit, up to 4× based on Center hits)",
    "Healing (Gooey Center- Per hit up to 4x based on number of Center hits)":
        "Healing with Gooey Center (per hit, up to 4× based on Center hits)",
    "Healing - Full Bloom (beyond first tick)": "Full Bloom healing (beyond first tick)",
    "Self Healing - Attached (per second)": "Self-healing while attached (per second)",
    "Shield - Attach (Synthesis or Floral Healing)": "Shield on attach (Synthesis or Floral Healing)",
    "Shield - Attach (Sweet Kiss)": "Shield on attach (Sweet Kiss)",
    "Damage - Execute": "Execute damage",
    "Damage - Additional": "Additional damage",
    "Damage - Additional (Same Target)": "Additional damage (same target)",
    "Damage - Additional to Marked Targets": "Additional damage to marked targets",
    "Damage - Additional per tick (x5)": "Additional damage per tick (×5)",
    "Damage - Subsequent Hits": "Subsequent hits",
    "Damage - Subsequent Punches": "Subsequent punches",
    "Damage - Second Hit": "Second hit",
    "Damage (Second Hit)": "Second hit",
    "Damage - Slam": "Slam damage",
    "Damage - Leap": "Leap damage",
    "Damage - Final Slash": "Final slash damage",
    "Damage - Reduced (up to 3 Hits)": "Reduced damage (up to 3 hits)",
    "Damage - DoT": "Damage over time",
    "Damage - DoT (3 Ticks)": "Damage over time (3 ticks)",
    "Damage - DoT (21 Ticks)": "Damage over time (21 ticks)",
    "Damage - Poison (10 Ticks)": "Poison damage (10 ticks)",
    "Damage - Basic": "Basic attack",
    "Damage - Basic [Fully Evolved] (2x)": "Basic attack (fully evolved)",
    "Damage - 3x (Full Gauge)": "Full-gauge damage (3×)",
    "Damage - Flare (Additional)": "Flare damage",
    "Damage - Explosion (Additional)": "Explosion damage (additional)",
    "Damage - Claw (Additional)": "Claw damage (additional)",
    "Damage - Shadow Ball Bonus": "Shadow Ball bonus damage",
    "Damage - Full Bloom (beyond first hit)": "Full Bloom damage (beyond first hit)",
    "Damage - Center (Charged)": "Center hit (charged)",
    "Damage - Conal (Charged)": "Cone hit (charged)",
    "Damage - Mid charge": "Mid charge",
    "Damage - Max Charge": "Max charge",
    "Damage (Dispatch formation Trooper)": "Trooper damage (Dispatch formation)",
    "Damage Boost": "Damage boost",
    "Debuff – Paralysis": "Paralysis debuff",
    "Attack Speed - Increase": "Attack speed increase",
    "Charm Duration": "Charm duration",
    "Between 40%-70% HP": "40–70% HP",
    "40%-70% HP": "40–70% HP",
}


def reword_add_label(label: str) -> str:
    """User-facing display form of an add{N}_label (verbatim when unmapped)."""
    return ADD_LABEL_REWORDS.get(label, label)


def advanced_desc(rsb: dict, upgrade_level=None) -> str:
    """UNITE-DB's detailed move text (Advanced mode): true_desc, then any
    secondary-effect true_descs (labeled "<label>: <value>" from add{N}_label
    via reword_add_label, so values never float context-free), then notes,
    then the level-up bonus line. Mirrors what unite-db.com shows. Returns ""
    when there is no true_desc (e.g. some non-combat passives) so the UI falls
    back to the basic text. Paragraphs are joined with a blank line; the
    tooltip renders newlines."""
    rsb = rsb or {}
    main = (rsb.get("true_desc") or "").strip()
    if not main:
        return ""
    parts = [main]
    for i in range(1, 6):
        add = (rsb.get(f"add{i}_true_desc") or "").strip()
        if add:
            label = (rsb.get(f"add{i}_label") or "").strip()
            parts.append(f"{reword_add_label(label)}: {add}" if label else add)
    notes = (rsb.get("notes") or "").strip()
    if notes:
        parts.append(notes)
    enhanced = (rsb.get("enhanced_true_desc") or "").strip()
    if enhanced:
        lvl = str(upgrade_level or "").strip()
        prefix = f"Upgrade (Level {lvl}): " if lvl else "Upgrade: "
        parts.append(prefix + enhanced)
    return "\n\n".join(parts)


def paragraphize_upgrade(text: str) -> str:
    """Ensure an 'Upgrade (Level N):' / 'Upgrade:' bonus starts its own paragraph
    (a blank line before it), regardless of how the source delimited it. Idempotent."""
    if not text:
        return text
    def repl(m):
        return ("" if m.start() == 0 else "\n\n") + m.group(1)
    return re.sub(r"\s*(Upgrade(?:\s*\([^)]*\))?:)", repl, text)


_BEAT_START = re.compile(
    r"^(?:"
    r"After the user learns\b|"
    r"After using this move\b|"
    r"After the attack\b|"
    r"When this move hits\b|"
    r"When this move is used\b|"
    r"When the user hits\b|"
    r"Whenever the user\b|"
    r"During this short time\b|"
    r"During this time\b|"
    r"For a short time afterward\b|"
    r"Opposing Pokémon that\b|"
    r"A maximum of\b|"
    r"Also\b|"
    r"This move can then be used again\b|"
    r"If this move is used again\b|"
    r"This effect can stack\b|"
    r"[A-Z][\w' -]* Effect:|"
    r"If (?!the user\b|used again\b)[A-Z][\w' -]* hits\b"
    r")"
)
_SENTENCE_END = re.compile(r"[.!?] +")


def paragraphize_basic_body(text: str) -> str:
    """Insert blank lines before new mechanical beats in a one-paragraph Basic body.

    Wording is unchanged. Bodies that already contain a blank line, have fewer
    than two sentences, or are shorter than 160 characters are returned as-is.
    """
    if not text:
        return text or ""
    if "\n\n" in text:
        return text
    if len(text.strip()) < 160:
        return text
    chunks: list[str] = []
    last = 0
    for m in _SENTENCE_END.finditer(text):
        rest = text[m.end() :]
        if rest and _BEAT_START.match(rest):
            chunks.append(text[last : m.start() + 1].strip())
            last = m.end()
    if last == 0:
        return text
    chunks.append(text[last:].strip())
    return "\n\n".join(chunks)


def paragraphize_archive_entry(text: str) -> str:
    """Paragraphize the Basic body; keep an existing Upgrade paragraph unchanged."""
    text = text or ""
    upgrade = extract_upgrade_paragraph(text)
    body = description_body(text)
    new_body = paragraphize_basic_body(body)
    if upgrade:
        return f"{new_body}\n\n{upgrade}" if new_body else upgrade
    return new_body


def collect_passive_archive_keys(bundle: dict) -> set[tuple[str, str]]:
    """Return ``(pokemon_id, normalized ability name)`` pairs from a bundle."""
    keys: set[tuple[str, str]] = set()
    for pokemon in bundle.get("pokemon") or []:
        pid = pokemon.get("id") or ""
        if not pid:
            continue
        abilities = [pokemon.get("passiveAbility") or {}]
        abilities.extend(pokemon.get("extraPassives") or [])
        for ability in abilities:
            name = ability.get("name") or ""
            key = _norm_move_name(name)
            if key:
                keys.add((pid, key))
    return keys


def _is_basic_attack_archive_key(key: str) -> bool:
    k = (key or "").strip().lower()
    return k in {"basic attack", "standard attack", "attack"} or k.startswith("attack -")


def paragraphize_move_archive(
    descriptions: dict, skip_keys: set[tuple[str, str]]
) -> tuple[dict, int]:
    """Paragraphize move bodies in an archive mapping. Skip passives and basic attacks.

    Returns the updated mapping and the number of entries whose text changed.
    """
    result = copy.deepcopy(descriptions)
    changed = 0
    for pid, bucket in result.items():
        if not isinstance(bucket, dict):
            continue
        for key, value in list(bucket.items()):
            if not isinstance(value, str) or (key or "").startswith("_"):
                continue
            if (pid, key) in skip_keys or _is_basic_attack_archive_key(key):
                continue
            new_value = paragraphize_archive_entry(value)
            if new_value != value:
                bucket[key] = new_value
                changed += 1
    return result, changed


def plus(s: str) -> str:
    """Space -> '+' for CDN art names (skills/<Pokemon>/<Move>.png)."""
    return (s or "").replace(" ", "+")


def skill_icon(folder: str, move_name: str) -> str:
    return f"{ASSETS}/skills/{plus(folder)}/{plus(move_name)}.png"


ACTIVATION_NOTE = re.compile(r"[.!?]?\s+Activates at Level \d+\s*$")


def strip_activation_note(text: str) -> str:
    """Remove a trailing stale 'Activates at Level N' sentence and ensure the
    result ends in sentence punctuation. The real unlock level is carried by
    the move's upgradeLevel, not this text."""
    if not text:
        return text
    cleaned = ACTIVATION_NOTE.sub("", text).rstrip()
    if cleaned and cleaned[-1] not in ".!?":
        cleaned += "."
    return cleaned


def ensure_sentence_end(text: str) -> str:
    """Ensure each ``\\n\\n``-separated Basic paragraph ends with ``.``, ``!``, or ``?``."""
    if not text:
        return text
    parts: list[str] = []
    for para in text.split("\n\n"):
        stripped = para.strip()
        if not stripped:
            parts.append(para)
            continue
        if stripped[-1] not in ".!?":
            # Preserve leading/trailing whitespace shape of the original paragraph
            # by appending to the rstrip'd body and keeping any trailing spaces out.
            parts.append(para.rstrip() + ".")
        else:
            parts.append(para)
    return "\n\n".join(parts)


_UPGRADE_START = re.compile(r"^Upgrade(?:\s*\([^)]*\))?:\s*", re.I)
_UPGRADE_ANY = re.compile(r"Upgrade(?:\s*\([^)]*\))?:", re.I)


def description_body(text: str) -> str:
    """Return *text* with Upgrade / Upgrade (Level N): paragraphs removed.

    Used to tell a real Basic/Advanced body from an upgrade-only leftover.
    """
    parts = []
    for para in (text or "").split("\n\n"):
        stripped = para.strip()
        if stripped and not _UPGRADE_START.match(stripped):
            parts.append(stripped)
    return "\n\n".join(parts)


def extract_upgrade_paragraph(advanced: str) -> str:
    """Return the first paragraph in *advanced* that starts with Upgrade / Upgrade (Level N):."""
    for para in (advanced or "").split("\n\n"):
        p = para.strip()
        if _UPGRADE_START.match(p):
            return p
    return ""


def append_upgrade_from_advanced(basic: str, advanced: str) -> str:
    """If Basic lacks an Upgrade marker, append Advanced's Upgrade paragraph only."""
    basic = basic or ""
    if _UPGRADE_ANY.search(basic):
        return basic
    upgrade = extract_upgrade_paragraph(advanced or "")
    if not upgrade:
        return basic
    basic = basic.rstrip()
    return f"{basic}\n\n{upgrade}" if basic else upgrade


def apply_archive_move_basic(move: dict, over: dict) -> None:
    """Replace *move* Basic with the owned archive body when one exists.

    Looks up ``_norm_move_name(name)``. For ``basicAttack``, also tries
    ``basic attack``, ``standard attack``, and ``attack``.
    """
    name = move.get("name") or ""
    keys = [_norm_move_name(name)]
    if move.get("slot") == "basicAttack":
        keys.extend(["basic attack", "standard attack", "attack"])
    archived = ""
    for key in keys:
        if not key:
            continue
        candidate = over.get(key, "")
        if description_body(candidate).strip():
            archived = candidate
            break
    if not archived:
        return
    move["description"] = ensure_sentence_end(strip_activation_note(archived))


# Pokémon whose on-field Ability is the last UNITE-DB stage (passive3, else
# passive2), not the pre-evolution ``name``. Mega licenses are a separate path
# (``mega_license_passive_names``) and must not be listed here. Dual-form
# licenses in ``FORM_PASSIVE_STAGES`` keep both stages and skip this lookup.
# Mew's ``passive2_name`` is Move Reset (a UI control), not the playable Ability.
PLAYABLE_PASSIVE_SLUGS = frozenset(
    {
        "solgaleo",
        "sylveon",
        "aegislash",
        "ceruledge",
        "dragonite",
        "espeon",
        "glaceon",
        "gyarados",
        "leafeon",
        "raichu",
        "tsareena",
        "tyranitar",
        "umbreon",
        "urshifu",
        "vaporeon",
    }
)

# Operator-confirmed dual/triple Passives that are evolution forms, not Mega.
# Values are (ability name, chip label) in display order. Add a slug only
# when stills show each staged Ability.
FORM_PASSIVE_STAGES: dict[str, tuple[tuple[str, str], ...]] = {
    "raichu": (("Static", "Pikachu"), ("Surge Surfer", "Raichu")),
    "sylveon": (("Adaptability", "Eevee"), ("Pixilate", "Sylveon")),
    "aegislash": (("No Guard", "Honedge"), ("Stance Change", "Aegislash")),
    "ceruledge": (("Flame Body", "Charcadet"), ("Weak Armor", "Ceruledge")),
    "dragonite": (("Marvel Scale", "Dragonair"), ("Multiscale", "Dragonite")),
    "espeon": (("Anticipation", "Eevee"), ("Magic Bounce", "Espeon")),
    "glaceon": (("Run Away", "Eevee"), ("Snow Cloak", "Glaceon")),
    "gyarados": (("Rattled", "Magikarp"), ("Moxie", "Gyarados")),
    "leafeon": (("Run Away", "Eevee"), ("Chlorophyll", "Leafeon")),
    "solgaleo": (
        ("Unaware", "Cosmog"),
        ("Sturdy", "Cosmoem"),
        ("Full Metal Body", "Solgaleo"),
    ),
    "tsareena": (("Oblivious", "Bounsweet"), ("Queenly Majesty", "Tsareena")),
    "tyranitar": (
        ("Guts", "Larvitar"),
        ("Shed Skin", "Pupitar"),
        ("Sand Stream", "Tyranitar"),
    ),
    "umbreon": (("Anticipation", "Eevee"), ("Inner Focus", "Umbreon")),
    "urshifu": (("Inner Focus", "Kubfu"), ("Unseen Fist", "Urshifu")),
    "vaporeon": (("Run Away", "Eevee"), ("Water Absorb", "Vaporeon")),
}


def form_passive_stages(pokemon_name: str) -> tuple[tuple[str, str], ...] | None:
    """Return (ability, chip label) pairs for a dual-form license, or None."""
    return FORM_PASSIVE_STAGES.get(slugify(pokemon_name))


def resolve_playable_passive(skill: dict | None, pokemon_name: str = "") -> dict | None:
    """Return the Passive skill the app should display for *pokemon_name*.

    UNITE-DB stores pre-evolution Abilities as the Passive skill ``name`` and
    later forms as ``passive2_name`` / ``passive3_name``. Allowlisted Pokémon
    are played as the final evolution, so the tooltip must show that Ability
    (Solgaleo Full Metal Body, Sylveon Pixilate, Tyranitar Sand Stream, …).
    Pokémon not on the list keep the raw skill. Never add ``mew`` (Move Reset
    is not the playable Ability). Never add mega-license slugs.

    When promoting a staged Ability, Basic ``description`` is cleared so
    ``move_descriptions.json`` can supply in-game Basic text. Advanced uses
    the staged ``passive3_description`` (or ``passive2_description``) only —
    the pre-evolution ``rsb`` is not copied.
    """
    if skill is None:
        return None
    if slugify(pokemon_name) not in PLAYABLE_PASSIVE_SLUGS:
        return skill
    final_name = (skill.get("passive3_name") or skill.get("passive2_name") or "").strip()
    if not final_name:
        return skill
    staged_desc = (
        skill.get("passive3_description") if skill.get("passive3_name") else skill.get("passive2_description")
    ) or ""
    staged_desc = staged_desc.strip()
    out = dict(skill)
    out["name"] = final_name
    out["description"] = ""
    out["rsb"] = {"true_desc": staged_desc} if staged_desc else {}
    return out


def is_mega_license(pokemon_name: str, display_name: str = "") -> bool:
    """True for Mega-evolution licenses, not Meganium or evo-line Pokémon."""
    display = (display_name or "").strip()
    raw = (pokemon_name or "").strip()
    return (
        display.startswith("Mega ")
        or raw.startswith("Mega-")
        or raw in ("MewtwoX", "MewtwoY")
    )


def staged_passive_names(skill: dict | None) -> list[str]:
    """Unique UNITE-DB Passive names in stage order."""
    if not skill:
        return []
    out: list[str] = []
    for key in ("name", "passive2_name", "passive3_name"):
        n = (skill.get(key) or "").strip()
        if n and n not in out:
            out.append(n)
    return out


def mega_license_passive_names(skill: dict | None) -> list[str]:
    """Final-stage names only: drop the first name when 3+ stages exist."""
    names = staged_passive_names(skill)
    if len(names) >= 3:
        return names[-2:]
    return names


# Mega licenses whose stills also show the pre-evolution Ability (before Pre-Mega).
# Values are the form-name chip. Add a slug only when stills show that Ability.
MEGA_PRE_EVO_STAGE: dict[str, str] = {
    "mega-gyarados": "Magikarp",
}


def mega_passive_slots(
    skill: dict | None, pokemon_name: str = ""
) -> list[tuple[str, str | None, str | None]]:
    """Return (ability, phase, stage_label) rows for a Mega license Moves card.

    Two-stage licenses emit Pre-Mega then Mega. Three-stage licenses still drop the
    first UNITE-DB name unless ``MEGA_PRE_EVO_STAGE`` names a form chip from stills.
    """
    names = mega_license_passive_names(skill)
    if len(names) != 2:
        return []
    rows: list[tuple[str, str | None, str | None]] = []
    staged = staged_passive_names(skill)
    if len(staged) >= 3:
        label = MEGA_PRE_EVO_STAGE.get(slugify(pokemon_name))
        if label:
            rows.append((staged[0], None, label))
    rows.append((names[0], "preMega", None))
    rows.append((names[1], "mega", None))
    return rows


def iter_playable_passives(pokemon: dict) -> list[dict]:
    """Primary ``passiveAbility`` plus any ``extraPassives``."""
    out: list[dict] = []
    primary = pokemon.get("passiveAbility")
    if isinstance(primary, dict):
        out.append(primary)
    for extra in pokemon.get("extraPassives") or []:
        if isinstance(extra, dict):
            out.append(extra)
    return out


def staged_passive_raw_basic(skill: dict, ability_name: str) -> str:
    """UNITE-DB Basic for *ability_name*. Later stages usually have none."""
    if (skill.get("name") or "").strip() == ability_name:
        return (skill.get("description") or "").strip()
    return ""


def staged_passive_advanced(skill: dict, ability_name: str) -> str:
    """Advanced text for one staged Ability name."""
    if (skill.get("name") or "").strip() == ability_name:
        return advanced_desc(skill.get("rsb"))
    if (skill.get("passive2_name") or "").strip() == ability_name:
        return (skill.get("passive2_description") or "").strip()
    if (skill.get("passive3_name") or "").strip() == ability_name:
        return (skill.get("passive3_description") or "").strip()
    return ""


def assemble_passive_ability(
    ability_name: str,
    folder: str,
    over: dict,
    raw_basic: str,
    raw_adv: str,
    pokemon_clips: dict,
    pokemon_gifs: dict,
    phase: str | None = None,
    stage_label: str | None = None,
) -> dict:
    """Build one bundle Ability dict (id, Basic, optional Advanced, art, phase)."""
    skill_like = {
        "name": ability_name,
        "description": raw_basic,
        "rsb": {"true_desc": raw_adv} if raw_adv else {},
    }
    # Do not let Advanced fill a missing Basic when the archive also has no body.
    if not description_body(raw_basic) and over.get(_norm_move_name(ability_name), "").strip():
        skill_like["rsb"] = {}
    desc = passive_basic_desc(skill_like, over)
    adv = paragraphize_upgrade(raw_adv) if raw_adv else ""
    out: dict = {
        "id": slugify(ability_name),
        "name": ability_name,
        "description": desc,
        "effects": [],
    }
    if adv:
        out["descriptionAdvanced"] = adv
    if ability_name:
        out["iconAsset"] = skill_icon(folder, ability_name)
        clip_path = pokemon_clips.get(out["id"])
        if clip_path:
            out["videoAsset"] = clip_path
        else:
            gif_path = pokemon_gifs.get(_norm_gif_key(ability_name))
            if gif_path:
                out["gifAsset"] = gif_path
    if phase:
        out["phase"] = phase
    if stage_label:
        out["stageLabel"] = stage_label
    return out


def passive_basic_desc(passive: dict | None, over: dict) -> str:
    """Resolve Basic-tier passive text: owned archive, then UNITE-DB, then Advanced.

    Returns empty string when passive is None. Archive wins when it has a real
    body (not upgrade-only). Advanced stays on ``descriptionAdvanced``.
    """
    if passive is None:
        return ""
    override = strip_activation_note(over.get(_norm_move_name(passive.get("name", "")), ""))
    if description_body(override).strip():
        return ensure_sentence_end(paragraphize_upgrade(override))
    desc = paragraphize_upgrade((passive.get("description") or "").strip())
    if desc.strip():
        return ensure_sentence_end(desc)
    return ensure_sentence_end(
        paragraphize_upgrade(((passive.get("rsb") or {}).get("true_desc") or "").strip())
    )


def build_move(skill: dict, slot: str, folder: str) -> dict:
    rsb = skill.get("rsb") or {}
    mtype = skill.get("type")
    name = skill.get("name", "")
    move = {
        "id": slugify(name or slot),
        "name": name,
        "slot": slot,
        "description": ensure_sentence_end(
            paragraphize_upgrade(skill.get("description", "") or "")
        ),
        "cooldownSeconds": num(skill.get("cd")),
        "damageInstances": damage_instances(rsb),
        "effects": [],
        "tags": [str(mtype).lower()] if mtype else [],
    }
    if mtype:
        move["moveType"] = mtype
    # Every slot has CDN art except the basic attack ("Attack" has no icon).
    if slot != "basicAttack":
        move["iconAsset"] = skill_icon(folder, name)
    adv = advanced_desc(rsb, skill.get("level2"))
    if adv:
        move["descriptionAdvanced"] = paragraphize_upgrade(adv)
    # Unite moves carry their unlock level on the raw skill ("level"); regular
    # moves don't (their level lives inside "upgrades"). Surface it as
    # upgradeLevel so the tooltip header renders "· Lv N".
    raw_level = skill.get("level")
    slug = move["id"]
    lvl = MANUAL_LEVEL.get(slug, raw_level)
    if lvl not in (None, ""):
        try:
            move["upgradeLevel"] = int(float(lvl))
        except (TypeError, ValueError):
            pass
    return move


def build_upgrade_move(up: dict, slot: str, folder: str) -> dict:
    """An upgrade option for Move 1/Move 2 (the actual moves picked in a build)."""
    rsb = up.get("rsb") or {}
    mtype = up.get("type")
    name = up.get("name", "")
    basic = up.get("description1", "") or ""
    # Some UNITE-DB description1 fields embed a bare "Upgrade:" marker. Promote it
    # to "Upgrade (Level N):" using the upgrade's own level2 so it matches every
    # other move's formatting. Idempotent: "Upgrade (Level …):" has a space after
    # "Upgrade" so it never contains the "Upgrade:" substring.
    lvl2 = str(up.get("level2") or "").strip()
    if lvl2 and "Upgrade:" in basic:
        basic = basic.replace("Upgrade:", f"Upgrade (Level {lvl2}):")
    d2 = (up.get("description2") or "").strip()
    if d2 and description_body(basic).strip():
        lvl = str(up.get("level2") or "").strip()
        prefix = f"Upgrade (Level {lvl}): " if lvl else "Upgrade: "
        basic = basic.rstrip() + "\n\n" + prefix + d2
    basic = paragraphize_upgrade(basic)
    move = {
        "id": slugify(name or slot),
        "name": name,
        "slot": slot,
        "description": basic,
        "cooldownSeconds": num(up.get("cd1")),
        "damageInstances": damage_instances(rsb),
        "effects": [],
        "tags": [str(mtype).lower()] if mtype else [],
        "iconAsset": skill_icon(folder, name),
        "isUpgrade": True,
    }
    if mtype:
        move["moveType"] = mtype
    lvl = up.get("level1")
    if lvl not in (None, ""):
        try:
            move["upgradeLevel"] = int(float(lvl))
        except (TypeError, ValueError):
            pass
    adv = advanced_desc(rsb, up.get("level2"))
    if adv:
        move["descriptionAdvanced"] = paragraphize_upgrade(adv)
    # Do NOT append Advanced Upgrade here — blank Basic must stay blank so
    # build_pokemon's move_descriptions backfill can supply the full in-game
    # body first. append_upgrade_from_advanced runs after that backfill.
    move["description"] = ensure_sentence_end(move["description"])
    return move


def _norm_gif_key(name: str) -> str:
    """Match fetch_gifs.py manifest keys (lowercase, drop ', -→space, drop .)."""
    return name.lower().replace("'", "").replace("-", " ").replace(".", "").strip()


def slugify(s: str) -> str:
    return "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-")


# UNITE-DB species names that are regional forms in this game. Bundle id and
# displayName are form-qualified so a later Kantonian (or other) license can
# use the bare species id. Art paths still use the UNITE-DB folder name.
REGIONAL_LICENSE_NAMES: dict[str, tuple[str, str]] = {
    "Raichu": ("alolan-raichu", "Alolan Raichu"),
    "Ninetales": ("alolan-ninetales", "Alolan Ninetales"),
    "Rapidash": ("galarian-rapidash", "Galarian Rapidash"),
}


def license_identity(raw_name: str, display_name: str | None = None) -> tuple[str, str]:
    """Return (bundle id, displayName) for a UNITE-DB Pokémon row."""
    if raw_name in REGIONAL_LICENSE_NAMES:
        return REGIONAL_LICENSE_NAMES[raw_name]
    return slugify(raw_name), display_name or raw_name


# UNITE-DB source data misspells some official Pokémon names and ships prose
# typos in Basic/Advanced text. Correct them at normalize time — never in
# _raw/ (re-downloaded by fetch.py) and never in the generated bundles
# (overwritten by this script). Keys are case-sensitive, so lowercase
# slugs/ids like "250-ho-oh" are never touched. When UNITE-DB ships the
# corrected string the replace is a no-op. Sentence-level or context-specific
# fixes (missing periods, "project" vs "projectile") stay in
# patch_note_overrides.json so they can expire per field.
SPELLING_FIXES = {
    "Chicorita": "Chikorita",
    "Ho-oh": "Ho-Oh",
    # The in-game English text is "Lumière of Demise" (verified against a
    # game screenshot); UNITE-DB drops the accent. Ids and asset paths stay
    # ASCII — ids are lowercase (never match) and *Asset fields are skipped
    # by fix_spelling_deep.
    "Lumiere": "Lumière",
    "Thundershock": "Thunder Shock",
    "movemenr": "movement",
    "oppposing": "opposing",
    "intial": "initial",
    "deacrease": "decrease",
    "damge": "damage",
    "attakck": "attack",
    "nulliffied": "nullified",
    "shadoww": "shadow",
    "isnide": "inside",
    "speeed": "speed",
    "hitos": "hits",
    "pases": "passes",
    "uanble": "unable",
    "othr": "other",
    "guage": "gauge",
    "gauage": "gauge",
    "disatance": "distance",
    "oppsing": "opposing",
    "blasing": "blasting",
    "Blass": "Blasts",
    "rapdily": "rapidly",
    "psychich": "psychic",
    "forawrd": "forward",
    "dirrection": "direction",
    "whiile": "while",
    "bcomes": "becomes",
    "efffect": "effect",
    "recoves": "recovers",
    "unabled": "unable",
    "illusary": "illusory",
    "targetted": "targeted",
    "preceeding": "preceding",
    "inititally": "initially",
    "Meowsacarda": "Meowscarada",
    "Solagaleo": "Solgaleo",
    "Pokmon": "Pokémon",
    "Pokémn": "Pokémon",
    "Pokemon": "Pokémon",
    "Hinderances": "Hindrances",
    "continus": "continues",
    "bounceds": "bounces",
    "illusionary": "illusory",
    "SpAtk": "Sp. Atk",
    "uesr": "user",
    "hit's": "hits",
    "it'self": "itself",
    "it's movement": "its movement",
    "it's basic": "its basic",
    "oor hits": "or hits",
    "lungest": "lunges",
    "the users ": "the user's ",
    "in designated direction": "in the designated direction",
    "this moves cooldown": "this move's cooldown",
    "the Trooper's total": "the Troopers' total",
    "Mewtwo attack": "Mewtwo's Attack",
    "HHas ": "Has ",
    "Pokeon": "Pokémon",
    "haas ": "has ",
    "up to 1 times": "up to 1 time",
    "designatedd": "designated",
    "telekinitic": "telekinetic",
    "telekenitic": "telekinetic",
    "conditionss": "conditions",
    "recieved": "received",
    "hinderances": "hindrances",
    "hinderance": "hindrance",
    "Freeze-Dery": "Freeze-Dry",
    "returnn": "return",
    "annd": "and",
    "aand": "and",
    "are of effect": "area of effect",
    "for short time": "for a short time",
    "2 increment for": "2 increments for",
    "Unleases": "Unleashes",
    "elaves": "leaves",
    "obsucres": "obscures",
    "direciton": "direction",
    "befre": "before",
    "might gust": "mighty gust",
    "for a short term": "for a short time",
    "Sp, Atk": "Sp. Atk",
    "shoot a flame of in": "shoot a flame in",
    "Every 2 this Unite": "Every 2 times this Unite",
    "the user Release": "the user releases",
}


def fix_spelling(s: str) -> str:
    for wrong, right in SPELLING_FIXES.items():
        s = s.replace(wrong, right)
    # Cooldown shorthand: "4s cd)" / "4s cd after" — not a second spelling map.
    s = re.sub(r"(\d+(?:\.\d+)?)s cd\b", r"\1s CD", s)
    return re.sub(r" {2,}", " ", s)


def fix_spelling_deep(obj):
    if isinstance(obj, str):
        return fix_spelling(obj)
    if isinstance(obj, list):
        return [fix_spelling_deep(item) for item in obj]
    if isinstance(obj, dict):
        return {
            k: v if isinstance(k, str) and k.endswith("Asset") else fix_spelling_deep(v)
            for k, v in obj.items()
        }
    return obj


def decode_emblem_link(link: str, pokedex_to_id: dict) -> list:
    """Decode a UNITE-DB boost-emblems link's `build=` param into emblem picks.

    Param looks like `250A,022A,...,142C` — each token is a 3-digit pokedex
    number + grade letter (A=gold, B=silver, C=bronze). Returns up to 10
    {emblemId, grade} picks, skipping any pokedex we don't have an emblem for.
    """
    if not link or "build=" not in link:
        return []
    raw = link.split("build=", 1)[1].split("&")[0]
    picks = []
    for tok in raw.split(","):
        tok = tok.strip()
        if len(tok) < 2:
            continue
        pokedex, letter = tok[:-1], tok[-1].upper()
        emblem_id = pokedex_to_id.get(pokedex)
        if emblem_id and letter in GRADE_MAP:
            picks.append({"emblemId": emblem_id, "grade": GRADE_MAP[letter]})
    return picks


def build_one_build(b: dict, pokedex_to_id: dict, valid_moves: set[str]) -> dict | None:
    """Normalize one UNITE-DB build entry. Skips placeholders (`soon`)."""
    if str(b.get("soon", "False")).lower() == "true":
        return None
    held = [slugify(h) for h in (b.get("held_items") or []) if h]
    emblem_links = b.get("emblem_link") or []
    emblems = decode_emblem_link(emblem_links[0], pokedex_to_id) if emblem_links else []
    emblem_names = b.get("emblem_name") or []
    out = {
        "name": b.get("name", "Build"),
        "heldItemIds": held,
        "emblems": emblems,
    }
    if b.get("lane"):
        out["lane"] = b["lane"]
    if emblem_names:
        out["emblemName"] = emblem_names[0]
    if b.get("held_items_optional"):
        out["heldItemOptional"] = slugify(b["held_items_optional"])
    if b.get("battle_item"):
        out["battleItemId"] = slugify(b["battle_item"])
    if b.get("battle_item_optional"):
        out["battleItemOptional"] = slugify(b["battle_item_optional"])
    # UNITE-DB's `upgrade` is sometimes malformed (empty dicts, or an emblem-set
    # name pasted in). Keep only entries that name a real move for this Pokémon.
    final_moves = [m for m in (b.get("upgrade") or []) if isinstance(m, str) and m in valid_moves]
    if final_moves:
        out["moves"] = final_moves
    return out


def _norm_move_name(name: str) -> str:
    """Normalize a move/passive display name to an archive/backfill key.

    Strips trailing parentheticals, folds diacritics (NFKD + strip combining
    marks), lowercases, and drops apostrophes so accented and ASCII spellings
    share one key (e.g. Lumière / Lumiere → ``lumiere of demise``).
    """
    n = re.sub(r"\s*\([^)]*\)\s*$", "", name or "")
    n = unicodedata.normalize("NFKD", n)
    n = "".join(c for c in n if not unicodedata.combining(c))
    return n.lower().replace("'", "").strip()


def build_pokemon(pokemon_rows, stats_rows, pokedex_to_id: dict, descs: dict | None = None,
                  gifs: dict | None = None, clips: dict | None = None) -> list:
    stats_by_name = {p["name"]: p for p in stats_rows}
    if descs is None:
        descs = load_move_descriptions()
    if gifs is None:
        gifs = load_move_gifs()
    if clips is None:
        clips = load_move_clips()
    out = []
    for p in pokemon_rows:
        name = p["name"]
        srow = stats_by_name.get(name)
        if not srow or len(srow.get("level", [])) < 15:
            print(f"  ! skipping {name}: missing 15-level stats")
            continue
        tags = p.get("tags") or {}
        skills = p.get("skills") or []
        raw_passive = next((s for s in skills if s.get("ability") == "Passive"), None)
        display_name = p.get("display_name", name)
        mega_slots = (
            mega_passive_slots(raw_passive, name)
            if is_mega_license(name, display_name)
            else []
        )
        form_stages = form_passive_stages(name)
        if mega_slots or form_stages:
            passive = raw_passive
        else:
            passive = resolve_playable_passive(raw_passive, name)
        moves = []
        for s in skills:
            slot = SLOT_MAP.get(s.get("ability", ""))
            if not slot:
                continue
            moves.append(build_move(s, slot, name))
            if slot in ("move1", "move2"):
                for up in (s.get("upgrades") or []):
                    if up.get("name"):
                        moves.append(build_upgrade_move(up, slot, name))
        mega = stats_by_name.get(f"Mega-{name}")
        move_names = {m["name"] for m in moves}
        builds = [nb for b in (p.get("builds") or [])
                  if (nb := build_one_build(b, pokedex_to_id, move_names))]
        exclude = p.get("exclude_stats")
        pid, display_name = license_identity(name, display_name)
        over = descs.get(pid, {})
        # Owned archive Basic wins over UNITE-DB whenever it has a real body.
        if over:
            for m in moves:
                apply_archive_move_basic(m, over)
        # After archive backfill, copy Advanced's Upgrade paragraph onto Basic when
        # Basic still lacks an Upgrade marker.
        for m in moves:
            adv = m.get("descriptionAdvanced") or ""
            if not adv:
                continue
            m["description"] = ensure_sentence_end(
                append_upgrade_from_advanced(m.get("description") or "", adv)
            )
        pokemon_gifs = gifs.get(pid, {})
        pokemon_clips = clips.get(pid, {})
        for m in moves:
            clip_path = pokemon_clips.get(m["id"])
            if clip_path:
                m["videoAsset"] = clip_path
            gif_path = pokemon_gifs.get(_norm_gif_key(m["name"]))
            if gif_path and not clip_path:
                m["gifAsset"] = gif_path
        extra_passives: list[dict] = []
        if mega_slots and raw_passive:
            built = [
                assemble_passive_ability(
                    ability_name,
                    name,
                    over,
                    staged_passive_raw_basic(raw_passive, ability_name),
                    staged_passive_advanced(raw_passive, ability_name),
                    pokemon_clips,
                    pokemon_gifs,
                    phase,
                    stage_label,
                )
                for ability_name, phase, stage_label in mega_slots
            ]
            passive_ability = built[0]
            extra_passives = built[1:]
        elif form_stages:
            built = [
                assemble_passive_ability(
                    ability_name,
                    name,
                    over,
                    staged_passive_raw_basic(raw_passive, ability_name) if raw_passive else "",
                    staged_passive_advanced(raw_passive, ability_name) if raw_passive else "",
                    pokemon_clips,
                    pokemon_gifs,
                    stage_label=label,
                )
                for ability_name, label in form_stages
            ]
            passive_ability = built[0]
            extra_passives = built[1:]
        elif passive and passive.get("name"):
            passive_ability = assemble_passive_ability(
                passive["name"],
                name,
                over,
                (passive.get("description") or "").strip(),
                advanced_desc(passive.get("rsb")),
                pokemon_clips,
                pokemon_gifs,
            )
        else:
            passive_ability = {
                "id": f"{slugify(name)}-passive",
                "name": "Passive",
                "description": "",
                "effects": [],
            }
        out.append({
            "id": pid,
            "displayName": display_name,
            "role": ROLE_MAP.get(tags.get("role"), "AllRounder"),
            "attackType": "special" if p.get("damage_type") == "Special" else "physical",
            "difficulty": DIFFICULTY_MAP.get(tags.get("difficulty"), 2),
            "imageAsset": f"{ASSETS}/pokemon/portrait/{name}.png",
            "iconAsset": f"{ASSETS}/pokemon/thumbnail/{name}.png",
            "evolutions": [{"level": 1, "formName": display_name}],
            "baseStatsByLevel": [stat_block(r) for r in srow["level"][:15]],
            "moves": moves,
            "passiveAbility": passive_ability,
            **({"extraPassives": extra_passives} if extra_passives else {}),
            **({"builds": builds} if builds else {}),
            **({"excludeStats": exclude} if isinstance(exclude, list) and exclude else {}),
            **({"hasMegaEvolution": True,
                "megaStats": [stat_block(r) for r in mega["level"][:15]]} if mega else {}),
        })
    return out


# ---- curated builds overlay ------------------------------------------------

CURATED = HERE / "curated_builds.json"
MOVE_DESCRIPTIONS = HERE / "move_descriptions.json"
OPERATOR_LOCKS = HERE / "operator_in_game_basic.json"
MOVE_GIFS = HERE / "move_gifs.json"
MOVE_CLIPS = HERE / "move_clips.json"
VALID_GRADES = {"bronze", "silver", "gold", "platinum"}


def load_move_gifs() -> dict:
    """pokemon id -> normalized move name -> /assets/...webp. Empty if absent."""
    if not MOVE_GIFS.exists():
        return {}
    return json.loads(MOVE_GIFS.read_text()).get("gifs", {})


def load_move_clips() -> dict:
    """pokemon id -> move id -> /assets/...mp4 (self-recorded clips). Empty if absent."""
    if not MOVE_CLIPS.exists():
        return {}
    return json.loads(MOVE_CLIPS.read_text()).get("clips", {})


def load_operator_locks(path: Path | None = None) -> dict[str, frozenset[str]]:
    """Return pokemon id → locked normalized move/Ability keys."""
    src = path or OPERATOR_LOCKS
    if not src.is_file():
        return {}
    raw = json.loads(src.read_text(encoding="utf-8")).get("locks") or {}
    out: dict[str, frozenset[str]] = {}
    for pid, keys in raw.items():
        if str(pid).startswith("_") or not isinstance(keys, list):
            continue
        out[str(pid)] = frozenset(str(k) for k in keys)
    return out


def assert_operator_lock_bodies(
    descriptions: dict,
    locks: dict[str, frozenset[str]] | None = None,
) -> None:
    """Raise if a locked in-game Basic key has no real archive body.

    Locked text is operator-owned. Normalize must not ship UNITE-DB in its place.
    """
    locked = locks if locks is not None else load_operator_locks()
    missing: list[str] = []
    for pid, keys in sorted(locked.items()):
        bucket = descriptions.get(pid) or {}
        for key in sorted(keys):
            if not description_body(bucket.get(key) or ""):
                missing.append(f"{pid}/{key}")
    if missing:
        raise ValueError(
            "operator in-game Basic lock missing archive body: " + ", ".join(missing)
        )


def load_move_descriptions() -> dict:
    """Owned in-game Basic fallback texts, keyed by pokemon id -> normalized
    move name -> description. Empty if the file is absent."""
    if not MOVE_DESCRIPTIONS.exists():
        print("  (no move_descriptions.json — skipping description backfill)")
        return {}
    descriptions = json.loads(MOVE_DESCRIPTIONS.read_text()).get("descriptions", {})
    assert_operator_lock_bodies(descriptions)
    return descriptions


def _validate_curated_build(b, pid, kind, emblem_ids, held_ids, battle_ids, upgrade_moves):
    """Hard-fail on bad ids/grades in a curated build; warn on unknown moves."""
    where = f"{pid} {kind} build {b.get('name', '?')!r}"
    if not isinstance(b.get("name"), str) or not b["name"]:
        raise ValueError(f"{where}: missing required 'name'")
    held = b.get("heldItemIds")
    if not isinstance(held, list):
        raise ValueError(f"{where}: 'heldItemIds' must be a list")
    for hid in held:
        if hid not in held_ids:
            raise ValueError(f"{where}: unknown heldItemId {hid!r}")
    if (v := b.get("heldItemOptional")) is not None and v not in held_ids:
        raise ValueError(f"{where}: unknown heldItemOptional {v!r}")
    for key in ("battleItemId", "battleItemOptional"):
        if (v := b.get(key)) is not None and v not in battle_ids:
            raise ValueError(f"{where}: unknown {key} {v!r}")
    for e in b.get("emblems", []):
        if e.get("emblemId") not in emblem_ids:
            raise ValueError(f"{where}: unknown emblemId {e.get('emblemId')!r}")
        if e.get("grade") not in VALID_GRADES:
            raise ValueError(f"{where}: bad grade {e.get('grade')!r}")
    for mv in b.get("moves", []):
        if mv not in upgrade_moves:
            print(f"  ! {where}: {mv!r} is not an upgrade move for {pid} "
                  f"(kept, but it won't resolve in the UI)")


def apply_curated_builds(pokemon, emblems, held, battle) -> None:
    """Overlay hand-curated builds/creativeBuilds and title renames from
    curated_builds.json onto the normalized Pokémon (mutates in place).

    No-op if the file is absent. Per Pokémon id the overlay may set:
      - "builds": full PokemonBuild list -> REPLACES the Recommended builds.
      - "creativeBuilds": full list -> SET as the Creative tab.
      - "recommendedTitles": [str] -> override emblemName by index on the
        raw-derived Recommended builds (mutually exclusive with "builds").
      - "emblemPreset": object -> SET as the Pokémon's manual emblem-optimizer
        preset (priorities / protectedFloors / colorTargets). This is the
        highest-priority override consumed by optimizerPresets.ts, taking
        precedence over the auto-generated emblemOptimizerPresets.json entry.
    Underscore-prefixed keys (e.g. "_comment") are ignored.
    """
    if not CURATED.exists():
        print("  (no curated_builds.json — skipping curation overlay)")
        return
    overlay = json.loads(CURATED.read_text())
    remap = overlay.get("_emblemNameRemap", {})
    prefix_remap = overlay.get("_emblemNamePrefixRemap", {})
    for p in pokemon:
        for b in p.get("builds", []):
            name = b.get("emblemName")
            rule = remap.get(name)
            if rule is None and name:
                # Prefix fallback: survives UNITE-DB word-order changes in the
                # "<Lean> Leaning ..." family (e.g. "Offense Leaning <X>").
                for prefix, prule in prefix_remap.items():
                    if name.startswith(prefix):
                        rule = prule
                        break
            if rule is None:
                continue
            new = rule if isinstance(rule, str) else rule.get(p["role"])
            if new:
                b["emblemName"] = new
            elif not isinstance(rule, str):
                print(f"  ! {p['id']}: no remap entry for role {p['role']!r} "
                      f"on label {name!r} — left unchanged")
    emblem_ids = {e["id"] for e in emblems}
    held_ids = {h["id"] for h in held}
    battle_ids = {b["id"] for b in battle}
    by_id = {p["id"]: p for p in pokemon}
    moves_by_id = {p["id"]: {m["name"] for m in p["moves"] if m.get("isUpgrade")}
                   for p in pokemon}
    n_rec = n_creative = n_titles = n_presets = 0
    for pid, spec in overlay.items():
        if pid.startswith("_"):
            continue
        p = by_id.get(pid)
        if p is None:
            raise ValueError(f"curated_builds.json: unknown Pokémon id {pid!r}")
        if "builds" in spec and "recommendedTitles" in spec:
            raise ValueError(f"{pid}: use either 'builds' or 'recommendedTitles', not both")
        if "builds" in spec:
            for b in spec["builds"]:
                _validate_curated_build(b, pid, "recommended", emblem_ids, held_ids, battle_ids, moves_by_id[pid])
            p["builds"] = spec["builds"]
            n_rec += len(spec["builds"])
        if "creativeBuilds" in spec:
            for b in spec["creativeBuilds"]:
                _validate_curated_build(b, pid, "creative", emblem_ids, held_ids, battle_ids, moves_by_id[pid])
            p["creativeBuilds"] = spec["creativeBuilds"]
            n_creative += len(spec["creativeBuilds"])
        if "recommendedTitles" in spec:
            titles = spec["recommendedTitles"]
            existing = p.get("builds", [])
            if len(titles) != len(existing):
                print(f"  ! {pid}: {len(titles)} recommendedTitles but {len(existing)} "
                      f"Recommended builds — applying by index")
            for b, t in zip(existing, titles):
                b["emblemName"] = t
                n_titles += 1
        if "emblemPreset" in spec:
            preset = spec["emblemPreset"]
            if not isinstance(preset, dict):
                raise ValueError(f"{pid}: emblemPreset must be an object")
            preset.setdefault("source", "manual")
            p["emblemPreset"] = preset
            n_presets += 1
    print(f"  curated overlay: +{n_rec} recommended, +{n_creative} creative, "
          f"{n_titles} titles renamed, {n_presets} emblem presets")


# ---- patch-note overrides --------------------------------------------------

PATCH_NOTE_OVERRIDES = HERE / "patch_note_overrides.json"
_OVERRIDE_EPS = 1e-9


def load_patch_note_overrides() -> list[dict]:
    """Load self-expiring patch-note overrides from patch_note_overrides.json."""
    if not PATCH_NOTE_OVERRIDES.exists():
        print("  (no patch_note_overrides.json — skipping patch-note overlay)")
        return []
    return json.loads(PATCH_NOTE_OVERRIDES.read_text()).get("overrides", [])


def _override_get_dotted(obj: dict, path: str):
    cur = obj
    for part in path.split("."):
        cur = cur[part]
    return cur


def _override_set_dotted(obj: dict, path: str, value) -> None:
    parts = path.split(".")
    cur = obj
    for part in parts[:-1]:
        cur = cur[part]
    cur[parts[-1]] = value


def _override_values_equal(actual, expect) -> bool:
    if isinstance(expect, list):
        if not isinstance(actual, list) or len(actual) != len(expect):
            return False
        return all(_override_values_equal(a, e) for a, e in zip(actual, expect))
    if isinstance(expect, (int, float)):
        return abs(float(actual) - float(expect)) < _OVERRIDE_EPS
    return actual == expect


def _override_find_pokemon(bundle: dict, pokemon_id: str) -> dict:
    by_id = {p["id"]: p for p in bundle.get("pokemon", [])}
    p = by_id.get(pokemon_id)
    if p is None:
        raise ValueError(f"patch-note override: unknown Pokémon id {pokemon_id!r}")
    return p


def _override_find_move(pokemon: dict, move_id: str) -> dict:
    for m in pokemon.get("moves", []):
        if m["id"] == move_id:
            return m
    for p in iter_playable_passives(pokemon):
        if p.get("id") == move_id:
            return p
    raise ValueError(
        f"patch-note override: unknown move id {move_id!r} for {pokemon['id']!r}"
    )


def _override_find_held_item(bundle: dict, item_id: str) -> dict:
    """Resolve a held or battle item by the shared `item` override key."""
    for h in bundle.get("heldItems", []):
        if h["id"] == item_id:
            return h
    for b in bundle.get("battleItems", []):
        if b["id"] == item_id:
            return b
    raise ValueError(f"patch-note override: unknown item id {item_id!r}")


def apply_patch_note_overrides(bundle: dict, overrides: list[dict]) -> tuple[int, int]:
    """Apply self-expiring patch-note overrides to the normalized bundle (mutates in place).

    Each entry targets a move or passive (pokemon+move ids) or a held/battle item (item id) and is guarded
    by its pre-patch value; a failed guard means UNITE-DB has shipped post-patch data, so
    the entry is skipped with a printed notice. Returns (applied, skipped) counts.
    Kinds: "set" (field must equal `expect`; supports the dotted path "effect.tiers"),
    "scaleDamage" (each listed damageInstances index must have ratio == expectRatios[k];
    multiplies ratio, slider, and base by `factor`, exact floats, no rounding),
    "replaceText" (replaces `find` with `replace` in each named description field;
    expires when `find` is absent from all of them; skipped as unsafe when `find`
    is a substring of `replace`, or when `find` is still present after the replace).
    """
    applied = 0
    skipped = 0

    for entry in overrides:
        kind = entry["kind"]
        why = entry.get("why", "")

        if "pokemon" in entry:
            pokemon = _override_find_pokemon(bundle, entry["pokemon"])
            target = _override_find_move(pokemon, entry["move"])
        elif "item" in entry:
            target = _override_find_held_item(bundle, entry["item"])
        else:
            raise ValueError("patch-note override: entry must specify pokemon or item")

        if kind == "set":
            field = entry["field"]
            current = _override_get_dotted(target, field)
            if not _override_values_equal(current, entry["expect"]):
                print(f"  ! patch-note override expired: {why}")
                skipped += 1
                continue
            _override_set_dotted(target, field, entry["value"])
            applied += 1

        elif kind == "scaleDamage":
            instances = target.get("damageInstances", [])
            expect_ratios = entry["expectRatios"]
            factor = entry["factor"]
            mismatch = False
            for idx, exp in zip(entry["instances"], expect_ratios):
                if idx >= len(instances) or not _override_values_equal(instances[idx]["ratio"], exp):
                    mismatch = True
                    break
            if mismatch:
                print(f"  ! patch-note override expired: {why}")
                skipped += 1
                continue
            for idx in entry["instances"]:
                inst = instances[idx]
                inst["ratio"] *= factor
                inst["slider"] *= factor
                inst["base"] *= factor
            applied += 1

        elif kind == "replaceText":
            find = entry["find"]
            replace = entry["replace"]
            if find in replace:
                print(f"  ! patch-note override unsafe (find is substring of replace): {why}")
                skipped += 1
                continue
            updates: list[tuple[str, str]] = []
            found_any = False
            unsafe = False
            for field in entry["fields"]:
                text = target.get(field)
                if not isinstance(text, str) or find not in text:
                    continue
                found_any = True
                new_text = text.replace(find, replace)
                if find in new_text:
                    unsafe = True
                    break
                updates.append((field, new_text))
            if unsafe:
                print(f"  ! patch-note override unsafe (find still present after replace): {why}")
                skipped += 1
                continue
            if not found_any:
                print(f"  ! patch-note override expired: {why}")
                skipped += 1
                continue
            for field, new_text in updates:
                target[field] = new_text
            applied += 1

        else:
            raise ValueError(f"patch-note override: unknown kind {kind!r}")

    print(f"  patch-note overrides: {applied} applied, {skipped} expired/skipped")
    return applied, skipped


# ---- held items ------------------------------------------------------------

HELD_ITEM_MAX_GRADE = 40


def held_item_factor(level: int) -> float:
    """Grade -> scaling factor for a held-item stat.

    Levels 1-30 scale linearly (factor == level). The level 31-40 grades (added
    in-game when the held-item cap was raised to 40) continue at half rate, so
    factor(30) == 30 and factor(40) == 35 — matching UNITE-DB (e.g. Curse Bangle
    Attack: 0.8*30 = 24 at G30, 0.8*35 = 28 at G40).
    """
    if level <= 30:
        return float(level)
    return 30.0 + 0.5 * (level - 30)


def held_item_value_at(stat: dict, level: int) -> float:
    """Stat value at a grade:  increment * factor(level)/(skip+1) + initial_diff.

    NB: the `float` field is a display-precision hint, NOT a rounding rule for
    the canonical value — Muscle Band's true G40 is 17.5 Attack / 8.75% even
    though float=0/1. We keep full precision and only clean FP noise later.
    """
    incr = num(stat.get("increment"))
    skip = num(stat.get("skip"))
    diff = num(stat.get("initial_diff"))
    return incr * held_item_factor(level) / (skip + 1.0) + diff


def icon_name(item: dict) -> str:
    """UNITE-DB item icons live at <name with spaces -> '+'>.png, using the
    punctuation-free `name` field (e.g. 'Exp Share', not 'Exp. Share')."""
    return item["name"].replace(" ", "+")


def held_item_effect(h: dict) -> dict | None:
    """Structured grade 1/10/20 scaling straight from UNITE-DB's own fields
    (a label + the three breakpoint values), so the UI never parses prose.
    e.g. Muscle Band -> {label: "Remaining HP", tiers: ["1%", "2%", "3%"]}."""
    label = (h.get("description3") or "").strip()
    tiers = [h.get("level1"), h.get("level10"), h.get("level20")]
    if not label or any(t in (None, "") for t in tiers):
        return None
    return {"label": label, "tiers": [str(t).strip() for t in tiers]}


def build_held_items(rows) -> list:
    out = []
    for h in rows:
        name = h["display_name"]
        stats_by_grade: dict[str, dict] = {}
        for level in range(1, HELD_ITEM_MAX_GRADE + 1):
            flats: dict[str, float] = {}
            for s in h.get("stats", []):
                value = held_item_value_at(s, level)
                mapped = map_stat(s.get("label", ""), value)
                if mapped is None:
                    continue
                field, decimal_value = mapped
                flats[field] = round(flats.get(field, 0) + decimal_value, 6)
            if flats:
                stats_by_grade[str(level)] = flats
        item = {
            "id": slugify(h["name"]),
            "displayName": name,
            "iconAsset": f"{ASSETS}/items/held/{icon_name(h)}.png",
            "description": h.get("description1", "") or "",
            "statsByGrade": stats_by_grade,
            "conditionalEffects": [],
        }
        effect = held_item_effect(h)
        if effect:
            item["effect"] = effect
        out.append(item)
    return out


def build_battle_items(rows) -> list:
    return [{
        "id": slugify(b["name"]),
        "displayName": b["display_name"],
        "iconAsset": f"{ASSETS}/items/battle/{icon_name(b)}.png",
        "description": b.get("description", "") or "",
        "effects": [],
    } for b in rows]


# ---- emblems ---------------------------------------------------------------

def emblem_stat_block(stats_list) -> dict:
    out = {}
    for s in stats_list or []:
        for k, v in s.items():
            mapped = map_stat(k, num(v))
            if mapped is None:
                continue
            field, decimal_value = mapped
            out[field] = out.get(field, 0) + decimal_value
    return out


def build_emblems(rows) -> list:
    grouped: dict[str, dict] = {}
    for e in rows:
        e["display_name"] = fix_spelling(e["display_name"])
        key = e.get("pokedex", e["display_name"])
        pokedex = e.get("pokedex", "")
        g = grouped.setdefault(key, {
            "id": f"{pokedex}-{slugify(e['display_name'])}".strip("-"),
            "pokemonName": e["display_name"],
            "colors": [c for c in [COLOR_MAP.get(e.get("color1")), COLOR_MAP.get(e.get("color2"))] if c],
            "iconAsset": f"{ASSETS}/emblems/pokedex/{pokedex}A.png",
            "statsByGrade": {},
            "_sourceGrades": set(),
        })
        grade = GRADE_MAP.get(e.get("grade"))
        if grade:
            g["_sourceGrades"].add(grade)
            g["statsByGrade"][grade] = emblem_stat_block(e.get("stats"))
    out = []
    for g in grouped.values():
        sbg = g["statsByGrade"]
        for grade in ("bronze", "silver", "gold"):
            sbg.setdefault(grade, sbg.get("gold") or sbg.get("silver") or sbg.get("bronze") or {})
        # UNITE-DB only publishes A-grade rows for some newer Pokémon (no silver/bronze).
        g["goldOnly"] = g.pop("_sourceGrades") == {"gold"}
        out.append(g)
    return out


def build_set_bonuses(rows) -> list:
    out = []
    for s in rows:
        color = COLOR_MAP.get(s.get("color"))
        mapped = map_stat(s.get("stat", ""), 0)
        stat_field = mapped[0] if mapped else "hp"  # placeholder for color w/o StatBlock stat
        sign = -1.0 if s.get("math") == "sub" else 1.0
        out.append({
            "color": color,
            "stat": stat_field,
            "thresholds": {
                str(int(s["count1"])): sign * num(s.get("bonus1")) / 100.0,
                str(int(s["count2"])): sign * num(s.get("bonus2")) / 100.0,
                str(int(s["count3"])): sign * num(s.get("bonus3")) / 100.0,
            },
        })
    return out


# ---- main ------------------------------------------------------------------

def main() -> None:
    emblems = build_emblems(load("emblems"))
    # pokedex number (e.g. "250") -> emblem id (e.g. "250-ho-oh"), for decoding builds.
    pokedex_to_id = {e["id"].split("-", 1)[0]: e["id"] for e in emblems}
    pokemon = build_pokemon(load("pokemon"), load("stats"), pokedex_to_id)
    held = build_held_items(load("held_items"))
    battle = build_battle_items(load("battle_items"))
    set_bonuses = build_set_bonuses(load("emblem_sets"))
    apply_curated_builds(pokemon, emblems, held, battle)

    bundle = {
        "patchVersion": PATCH_VERSION,
        "lastUpdated": date.today().isoformat(),
        "dataSource": {
            "provider": "UNITE-DB",
            "url": "https://unite-db.com",
            "note": "Community-sourced (APK bundles encrypted; see tools/extract/ENCRYPTION-FINDINGS.md). "
                    "Held-item values span grades 1–40 (in-game max 40). Percentages stored as decimals.",
            "fetched": date.today().isoformat(),
        },
        "pokemon": pokemon,
        "heldItems": held,
        "battleItems": battle,
        "emblems": emblems,
        "setBonuses": set_bonuses,
    }
    bundle = fix_spelling_deep(bundle)
    apply_patch_note_overrides(bundle, load_patch_note_overrides())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(bundle, indent=2, ensure_ascii=False) + "\n")
    print(f"\nWrote {OUT}")
    print(f"  pokemon={len(pokemon)} heldItems={len(held)} battleItems={len(battle)} "
          f"emblems={len(emblems)} setBonuses={len(set_bonuses)}")


if __name__ == "__main__":
    main()
