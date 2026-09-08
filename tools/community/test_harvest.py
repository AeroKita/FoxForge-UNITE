"""Unit tests for harvest_descriptions.py — archive Basic move/passive text from the bundle."""

from __future__ import annotations

import copy
import unittest

from harvest_descriptions import harvest


def _bundle(**pokemon_overrides) -> dict:
    base = {
        "id": "pikachu",
        "displayName": "Pikachu",
        "moves": [],
        "passiveAbility": {"id": "static", "name": "Static", "description": ""},
    }
    base.update(pokemon_overrides)
    return {"patchVersion": "1.0.0.0", "pokemon": [base]}


class TestHarvest(unittest.TestCase):
    def test_new_text_is_added(self):
        bundle = _bundle(
            moves=[
                {
                    "id": "thunderbolt",
                    "name": "Thunderbolt",
                    "slot": "move1",
                    "description": "Deals damage.",
                }
            ]
        )
        archive: dict = {}
        updated, changes = harvest(bundle, archive)
        self.assertEqual(updated["pikachu"]["thunderbolt"], "Deals damage.")
        self.assertEqual(len(changes), 1)

    def test_changed_text_is_updated(self):
        bundle = _bundle(
            moves=[
                {
                    "id": "thunderbolt",
                    "name": "Thunderbolt",
                    "slot": "move1",
                    "description": "New wording.",
                }
            ]
        )
        archive = {"pikachu": {"thunderbolt": "Old wording."}}
        updated, changes = harvest(bundle, archive)
        self.assertEqual(updated["pikachu"]["thunderbolt"], "New wording.")
        self.assertEqual(len(changes), 1)

    def test_blank_never_overwrites(self):
        bundle = _bundle(
            moves=[
                {
                    "id": "thunderbolt",
                    "name": "Thunderbolt",
                    "slot": "move1",
                    "description": "",
                }
            ]
        )
        archive = {"pikachu": {"thunderbolt": "Preserved text."}}
        updated, changes = harvest(bundle, archive)
        self.assertEqual(updated["pikachu"]["thunderbolt"], "Preserved text.")
        self.assertEqual(changes, [])

    def test_extra_passives_are_harvested(self):
        bundle = _bundle(
            extraPassives=[
                {
                    "id": "drought",
                    "name": "Drought",
                    "description": "The sunlight surrounding the Pokémon becomes stronger.",
                }
            ]
        )
        archive: dict = {}
        updated, changes = harvest(bundle, archive)
        self.assertEqual(
            updated["pikachu"]["drought"],
            "The sunlight surrounding the Pokémon becomes stronger.",
        )
        self.assertTrue(any("Drought" in line for line in changes))

    def test_passive_is_harvested(self):
        bundle = _bundle(
            passiveAbility={
                "id": "static",
                "name": "Static",
                "description": "May paralyze on hit.",
            }
        )
        archive: dict = {}
        updated, changes = harvest(bundle, archive)
        self.assertEqual(updated["pikachu"]["static"], "May paralyze on hit.")
        self.assertEqual(len(changes), 1)

    def test_idempotent(self):
        bundle = _bundle(
            moves=[
                {
                    "id": "thunderbolt",
                    "name": "Thunderbolt",
                    "slot": "move1",
                    "description": "Deals damage.",
                }
            ],
            passiveAbility={
                "id": "static",
                "name": "Static",
                "description": "May paralyze on hit.",
            },
        )
        archive: dict = {}
        updated, changes1 = harvest(bundle, archive)
        _, changes2 = harvest(bundle, updated)
        self.assertGreater(len(changes1), 0)
        self.assertEqual(changes2, [])

    def test_existing_hand_entries_survive(self):
        bundle = _bundle(moves=[])
        archive = {"missingmon": {"some move": "Hand-written."}}
        updated, changes = harvest(bundle, archive)
        self.assertEqual(updated["missingmon"]["some move"], "Hand-written.")
        self.assertEqual(changes, [])

    def test_accented_display_name_updates_unaccented_archive_key(self):
        """Accented bundle names must update the folded key, not create a diacritic duplicate."""
        bundle = _bundle(
            id="yveltal",
            displayName="Yveltal",
            moves=[
                {
                    "id": "lumiere",
                    "name": "Lumière of Demise",
                    "slot": "unite",
                    "description": "Beam text.",
                }
            ],
        )
        archive = {"yveltal": {"lumiere of demise": "Old beam text."}}
        updated, changes = harvest(bundle, archive)
        self.assertEqual(updated["yveltal"]["lumiere of demise"], "Beam text.")
        self.assertNotIn("lumière of demise", updated["yveltal"])
        self.assertEqual(len(changes), 1)

    def test_upgrade_only_never_overwrites_full_archive_body(self):
        """Upgrade-only bundle text must not replace a real archived Basic body."""
        body = (
            "Has the user create four small flames while advancing in the designated direction. "
            "The flames shoot toward opposing Pokémon one by one, dealing damage and decreasing "
            "the opposing Pokémon's Sp. Atk for a short time when they hit. Each time a flame "
            "hits, it reduces the cooldown of this move."
        )
        bundle = _bundle(
            id="sylveon",
            displayName="Sylveon",
            moves=[
                {
                    "id": "mystical-fire",
                    "name": "Mystical Fire",
                    "slot": "move1",
                    "description": "Upgrade (Level 10): Increases the number of flames by one.",
                }
            ],
        )
        archive = {"sylveon": {"mystical fire": body}}
        updated, changes = harvest(bundle, archive)
        self.assertEqual(updated["sylveon"]["mystical fire"], body)
        self.assertFalse(any(line.startswith("~") for line in changes))

    def test_upgrade_only_is_not_archived_as_new_entry(self):
        """Upgrade-only bundle text is treated like blank and is not seeded."""
        bundle = _bundle(
            id="sylveon",
            displayName="Sylveon",
            moves=[
                {
                    "id": "mystical-fire",
                    "name": "Mystical Fire",
                    "slot": "move1",
                    "description": "Upgrade (Level 10): Increases the number of flames by one.",
                }
            ],
        )
        updated, changes = harvest(bundle, {})
        self.assertNotIn("mystical fire", updated.get("sylveon", {}))
        self.assertEqual(changes, [])

    def test_full_bundle_text_updates_upgrade_only_archive(self):
        """A real body in the bundle replaces a leftover upgrade-only archive key."""
        body = (
            "Has the user create four small flames while advancing in the designated direction. "
            "The flames shoot toward opposing Pokémon one by one, dealing damage and decreasing "
            "the opposing Pokémon's Sp. Atk for a short time when they hit. Each time a flame "
            "hits, it reduces the cooldown of this move.\n\n"
            "Upgrade (Level 10): Increases the number of flames by one."
        )
        bundle = _bundle(
            id="sylveon",
            displayName="Sylveon",
            moves=[
                {
                    "id": "mystical-fire",
                    "name": "Mystical Fire",
                    "slot": "move1",
                    "description": body,
                }
            ],
        )
        archive = {
            "sylveon": {
                "mystical fire": "Upgrade (Level 10): Increases the number of flames by one."
            }
        }
        updated, changes = harvest(bundle, archive)
        self.assertEqual(updated["sylveon"]["mystical fire"], body)
        self.assertEqual(len(changes), 1)
        self.assertTrue(changes[0].startswith("~"))


if __name__ == "__main__":
    unittest.main()
