# FoxForge UNITE end-user copy audit (full roster)

**Historical.** The copy pipeline (`SPELLING_FIXES`, `replaceText` in `patch_note_overrides.json`, banned-fragment CI in `patchBundle.test.ts`) has landed. Do not re-execute this audit. New typos go through `SPELLING_FIXES` / `replaceText` per [`docs/11-adding-content.md`](11-adding-content.md). Keep this file as an inventory of what was found.

**Coverage:** every Pokémon Basic + Advanced move and passive in `src/data/patch-current.json` (100 Pokémon, 1,660 description fields), plus all 41 held-item descriptions (and labels/tiers), and the 10 battle-item descriptions users see in tooltips.

**Method:** extracted every field, then read each Pokémon’s texts (Absol→Zoroark) and every held item. Findings below are verified against the shipped JSON.

**Not listed:** official UNITE “Has the user…” voice; Advanced `themself`; semicolon-as-comma Advanced style; leading decimals (`.75s`); British forms official text also uses (`cancelled`, `colour`, `travelled`); already-fixed pipeline fragments (`movemenr`, `the project deals`, `can the be`, Chikorita/Ho-Oh/Lumière, etc.).

---

## Held items (all 41 read)

| Item | Issue | Fix |
|---|---|---|
| Assault Vest | `even if its not fully depleted` | it's not |
| Amulet Coin | `(16s cd)` | CD |
| Big Root | `from self healing` | self-healing |
| Choice Scarf | `non movement, non auto attack` | non-movement, non-auto-attack |
| Charizardite X / Y, Gyaradosite, Lucarionite | `One of the variety` | One of a variety (Mewtwonite already correct) |
| Buddy Barrier / Resonant Guard | `grants the holder and 1 nearby ally with the lowest` | grants the holder and the nearby ally with the lowest (drop extra *with* after “grants”) |
| Wise Glasses | body says `Sp. Atk`; label says `Sp. Attack` | pick one |
| Drain Crown / Rocky Helmet / Resonant Guard | mixed `9%/12%/15%` vs `9/12/15%` slash style | consistent slashes |
| Scope Lens | label `Of Attack Stat` | awkward; “% of Attack” would match the body |

Clean held items: Accel Bracer, Aeos Cookie, Attack Weight, Charging Charm, Choice Specs, Curse Bangle, Curse Incense, Drive Lens, Energy Amplifier, Exp. Share, Float Stone, Focus Band, Leftovers, Mewtwonite X/Y, Muscle Band, Rapid-Fire Scarf, Razor Claw, Rescue Hood, Rocky Helmet (numbers only; slash style above), Rusted Sword, Score Shield, Shell Bell, Slick Spoon, Sp. Atk Specs, Tenacity Belt, Vanguard Bell, Weakness Policy.

### Battle items (tooltip text)

| Item | Issue | Fix |
|---|---|---|
| Goal Hacker | `applications … overrides` | override |
| Fluffy Tail | `60% SpAtk` | Sp. Atk |
| Full Heal | `Cleanses …, and becomes unstoppable` | subject is the user; “the user becomes” is clearer |

---

## Pokémon findings (A–Z)

Pokémon with **no** issues of the types above: **Charizard, Cramorant, Gardevoir, Gengar, Mega Gyarados, Mamoswine, Meganium, Moltres, Morpeko, Mr. Mime, Ninetales, Palkia, Quaquaval, Raichu, Rapidash, Reshiram, Slowbro, Snorlax, Tinkaton, Venusaur, Yveltal, Zeraora.**

### Absol
- Attack Advanced: `every third attack, and decreasing their Defense` — `their` has no noun.
- Night Slash Basic: `the lower the enemies HP` → enemies'

### Aegislash
- Attack Basic: `Up to 4 boosted boosted attacks` → boosted attacks

### Alcremie
- Attack Advanced: `throwing whip cream` → whipped cream
- Helping Hand Advanced: `the recipients Attack` → recipient's; sentence has no closing period

### Armarouge
- Fire Spin Basic: `6 times.If the user` → times. If

### Articuno
- Ice Wing Whiteout Basic is only the upgrade line (`Increases the duration this move leaves opposing Pokémon frozen.`) — not a Unite Move description (Advanced describes the blizzard).
- Snow Cloak Basic + Advanced: `or Unite Move is used the user gains` → used, the user

### Azumarill
- Whirlpool Basic: `the amount of HP it restored` → restores
- Belly Bash Advanced: `within the area effect` → area of effect

### Blastoise
- Hydro Pump Basic: `blasing out a huge volume` → blasting
- Water Spout Advanced: `damaging opposing over time` → opposing Pokémon
- Surf Advanced: `a Pokemon` / `Enemy Pokemon` → Pokémon

### Blaziken
- Aerial Ace / Fire Punch (×2) / Overheat / Focus Blast / Blaze Kick Basic: missing space after period (`hits.When`, `hits.The`, `move.When`, `direction.The`, `time.If`)
- Overheat Advanced: `designed direction` → designated
- Spinning Flame Kick Advanced: `for a 4s` → for 4s

### Blissey
- Helping Hand Basic: `nearby allies movement speed` → allies'
- Heal Pulse Basic: `designated ally HP` → ally's HP
- Soft-Boiled Advanced: `Subsequent uses … overwrites` → overwrite
- Natural Cure Basic: `all status condition` → conditions

### Buzzwole
- Smack Down Advanced: `buzzwole can activate` → Buzzwole
- Ultra Swole Slam Advanced: `Wild Pokemon` → Pokémon

### Ceruledge
- Bitter Blade Advanced: `recovers HP equals to 50%` → equal to
- Flame Charge Basic: `2 use(s)` → 2 uses
- Passive (Charcadet): `4s cd` → CD

### Chandelure
- Imprison Advanced: `in the zone or enter the zone` → or that enter (Basic already has `that`)

### Mega Charizard X
- Fire Punch Basic body describes an intense blast of fire / burn (Flamethrower copy), not the fiery-fist dash Advanced describes.

### Mega Charizard Y
- Fire Blast Basic: `Blass intense` → Blasts
- Seismic Slam Basic: `for aa set time` → a set time

### Cinderace
- Feint Basic: `Increases movement speed … and become invincible` → becomes

### Clefable
- Follow Me Basic: `basic attacks.When this move`
- Wonder Wish Basic: `that ally.Afterward`
- Follow Me Advanced: `Attention of enemies hit … are drawn` → The attention … is drawn

### Comfey
- Synthesis Advanced: `Restores additional HP with for each flower` → HP for each flower

### Crustle
- Rubble Rouser Advanced: `the whirlwind of rocks damage nearby` → damages

### Darkrai
- Dark Void Advanced: `within in the area`; `to marked enemy`; `the Enemy falls`
- Shadow Claw Basic: `used agai and` → again
- Dark Pulse Basic: `Has the user hide … and creates`
- Bad Dreams Basic + Advanced: `When Darkrai uses this boosted,` → this boosted attack
- Nasty Plot Advanced: `turn the boosted and all nasty plot counters` — missing “attack”

### Decidueye
- Razor Leaf Basic: `the enemies remaining HP` → enemies'
- Nock Nock Basic: `if the enemies remaining HP` → enemies'

### Delphox
- Fire Spin Basic + Advanced upgrade: `Debuff is only cleansable after the first tick of trap damage and does not re-apply the debuff` — second clause has no clear subject.

### Dhelmise
- Anchor Shot Basic: `uanble` → unable
- Heavy Slam Basic: `leaving the munable to act` → leaving them unable
- Seaweed Snare Basic: `If othr Pokémon` → other
- Bulldoze Basic: `slamming its anchor dealing` → missing comma
- Steelworker: `(5s cd)` → CD

### Dodrio
- Attack Basic: `sprint gauage` → gauge
- Attack Advanced: `If the sprint gauged attack hits` → sprint-gauge attack
- Peck Advanced: `jab the in the facing direction` → jab in

### Dragapult
- Dragon Breath Basic: `damage over tim`; `the uesr is flying`; `and the decreasing their movement speed`
- Dragon Dance Basic: `Dragon's Breath's cooldown` → Dragon Breath's; `its attacks also restores HP` → restore

### Dragonite
- Draco Impact Basic: `Unite guage`; `min disatance`
- Dratini Attack Basic: `and recover 5% max HP` → recovers
- Twister Basic + Advanced: `dealing damage … and decreases` → decreasing

### Duraludon
- Revolving Ruin Basic: `damage continus to be taken` → continues
- Flash Cannon Basic: `rooting Duraludon for 6s or if a basic attack is not made… or this move can be cancelled` — broken “or if / or this” chain
- Dragon Pulse Advanced: `Opposing Duraludon's can consume` → Duraludons; `this moves cooldown` → move's
- Stealth Rock Advanced: `a shield for 3s, can stack` — missing “that”

### Eldegoss
- Attack Basic: `decreases the enemies movement speed` → enemy's; `deal … and decreases` → decrease

### Empoleon
- Water Gun Basic: `opposing Pokmon` → Pokémon
- Metal Claw Basic: `opposing Pokmon` → Pokémon
- Hydro Cannon Basic + Advanced: `this moves cooldown` → move's
- Metal Claw Basic upgrade: `Increased the shield` → Increases

### Espeon
- Psychic Solare Basic: `After a dela,` → delay
- Psybeam Basic: `decreased or unable to act` → or is unable; `an unable to act initial target`
- Psybeam Advanced: `Espeons relative facing` → Espeon's; same “unable to act initial target”
- Future Sight Basic: `psychich projectiles`; `when the blasts hits` → hit
- Future Sight Advanced: `locked-on targets missing HP` → target's; `Blissey's Natural cure` → Natural Cure

### Falinks
- Beat Up Basic: `A maximum of {0} use(s)` (Advanced has a number — confirm before substituting)
- Beat Up Basic: `Pokémon it hit.` → hits
- Iron Head / Dust Devil / No Retreat Advanced: `the Trooper's total` → Troopers'

### Feraligatr
- Big Jaw Bite Basic: `charges at the designated panel from the opposing team` → Pokémon

### Garchomp
- Livid Outrage Advanced: `Every attack more damage than the last.` → Every attack deals more

### Glaceon
- Freeze-Dry Basic: `short time. . This`
- Glacial Stage Advanced: `ice zone in in the`; `movement speed is increased …, and gains 1 ice crystal` (missing Glaceon)
- Icy Wind Basic: `that enemies movement speed` → enemy's
- Run Away Basic: `the hindrance is negated and becomes invincible` — missing subject (Eevee)

### Goodra
- Muddy Water Advanced: `The defenses bonus effect` → defense
- Gooey Basic + Advanced: `, Decreases their attack speed` → lowercase decreases

### Greedent
- Tackle / Bullet Seed / Belch Basic (and Belch Advanced): `dealing/Deals damage … and decrease their` — agreement

### Greninja
- Attack Basic: `the enemies remaining HP` → enemy's
- Double Team Advanced: `illusionary copies` (Basic already uses illusory)
- Waterburst Shuriken Basic: `dealing damage … and throws them` → throwing

### Gyarados
- Bounce Basic: `when it bounceds` → bounces

### Ho-Oh
- Sky Attack Basic + Advanced: `While the Ho-Oh is` → While Ho-Oh is
- Tailwind Advanced: `in designated direction` → in the designated direction
- Rekindling Flame Advanced: `One ally may be always revived` → may always be revived

### Hoopa
- Phantom Force Basic + Advanced / Shadow Ball Basic: `deal/dealing damage … and decreases`

### Inteleon
- Liquidation Basic: `hits {0} times`; also `, damage the opposing Pokémon takes` → the damage the opposing Pokémon takes

### Lapras
- Ice Shard Advanced: `shoves in the direction` → shoves it in the direction

### Latias
- Mist Ball Basic: `If either Latias or Latios deal damage` → deals

### Latios
- Draco Meteor Basic: `summon down comet s onto`; `the move comets are summoned` → the more comets
- Dragon Pulse Basic: `the more projectiles are released and damage they deal` — missing “the more” before damage (Latias’s matching line has it)

### Leafeon
- Leaf Blade Basic + Advanced: upgrade line has no closing period
- Leaf Blade Advanced: `slashing around itself and with a ring` → extra “and”
- Razor Leaf Advanced: `Each fan, the first leaf` → For each fan
- Aerial Ace Advanced: `a boosted attack non-Chlorophyll empowered`

### Lucario
- Power-Up Punch Basic: `the enemies remaining HP` → enemy's

### Mega Lucario
- Power-Up Punch Basic: `itsm ovement speed` → its movement; `one of the user's move hits` → moves
- Close Combat Advanced: `Power-Up punch` → Power-Up Punch
- Aura Cannon Basic: `opposing Pokmon`; missing period: `area of effect After using`

### Machamp
- Bulk Up Advanced: `inititally` → initially
- Cross Chop Advanced: `auto attacks increases Atk` → increase
- Dynamic Punch Basic: `speed is increased` → are increased
- Submission Basic: `and become immune` → becomes

### Meowscarada
- Night Slash Advanced: `The users throws` → The user throws
- Trailblaze Basic: `range increases.< If the user` — leftover `<`
- Floral Flourish Advanced: `Meowsacarda` → Meowscarada

### Meowth
- Pay Day Basic: `A maximum of {0} use(s)`
- Assurance Basic + Advanced: `this moves cooldown` → move's

### Metagross
- Gyro Ball Basic: `spin rapdily`; `oor hits Pokémon` → or
- Compute and Crush Basic: `recoves`; `lungest toward`; missing period after `Unite Move gauge When 3 or more`
- Compute and Crush Advanced: `Compute and Crash` → Crush

### Mew
- Electro Ball Advanced: `Wild Pokemon`
- Coaching Basic: literal `\u201ccoached\u201d` (users see the escape, not curly quotes)
- Coaching Basic + Advanced upgrade: `recently coached on allies` → recently coached allies
- Mystical Mirage Advanced: `then becoming invincible` → then becomes

### Mega Mewtwo X
- Attack Basic + Advanced: `When Mewtwo Mega Evolves, deal increased damage and becomes a boosted attack`
- Pressure Basic: `Mewtwo attack is increased` / `increases Mewtwo attack` → Mewtwo's

### Mega Mewtwo Y
- Future Sight Basic: `based on the the amount`
- Teleport Basic: `movement speed and damage dealt increases` → increase

### Mimikyu
- Scratch / Shadow Sneak Advanced: `Wild Pokemon`
- Shadow Sneak Advanced: `and refresh the duration` → refreshes

### Miraidon
- Charge Beam / Electro Drift Basic: `2 use(s)`
- Parabolic Charge Basic: `1 stored use(s)` (Advanced already says `1 stored use`)

### Pawmot
- Thunder Punch Basic: `Pokémon it hit.` → hits
- Volt Switch Basic: `used again once only Fighter Mode;` — mode clause smashed into the sentence

### Pikachu
- Electro Ball Basic: `the enemies remaining HP` → enemies'

### Psyduck
- Disable Basic: ends at `While the mysterious power is active.` — sentence cut off
- Psychic Basic: `If this move it used again` → is used

### Sableye
- Attack Basic: `charge boosted attack immediately` → a boosted attack
- Chaos Glower Basic: `an cone` → a cone
- Thief Advanced: `slowing 20% for 2s` → slowing them by 20%
- Shadow Sneak Advanced: `stealth's Sableye` → stealths

### Scizor
- Red Illusion Dive Advanced: `non targetted`; `illusary`; `them an slowing them`

### Scyther
- Dual Wingbeat Advanced: `Wild Pokemon`

### Sirfetch'd
- Detect Basic + Advanced: `this moves cooldown` → move's

### Skeledirge
- Roar Basic: `oppsing Pokémon` → opposing

### Solgaleo
- Shining Meteor Crush Advanced: `Solagaleo can see` → Solgaleo

### Suicune
- Avalanche Basic: `it hits.At the end`
- Icy Wind Basic: `it hits Once the freezing` — missing period
- Endless Ice Spikes Advanced: `Cleanses the user of status condition` → conditions

### Sylveon
- Calm Mind Advanced: `Hinderances` → Hindrances
- Draining Kiss Advanced: `The closer Sylveon and the target is` → are

### Talonflame
- Flame Sweep Basic: `forawrd` → forward
- Flame Charge Basic: `the enemies defense` → enemies' Defense

### Trevenant
- Attack Advanced: `dealing increased damage … and heal for 5%` → healing
- Natural Cure Basic + Advanced: `each time one of Trevenant's moves damage` → damages

### Tsareena
- Stomp Basic: `attacks enemies their feet` → with their feet
- Attack Basic: `lunging at an opposing Pokémon, damage nearby` → damaging
- Oblivious Basic: `inflicted on Bounsweet, Steenee;` → Bounsweet or Steenee
- Blaze-style rage passive uses `SpAtk` (Typhlosion Blaze)

### Typhlosion
- Ember Advanced: `will target … and inflicts a burn` → inflict
- Tackle Basic: `opposing Pokémn` → Pokémon
- Flame Wheel Basic: `efffect` → effect
- Explosive Heat Haze Basic: `bcomes` → becomes
- Blaze Basic + Advanced: `15% SpAtk` → Sp. Atk

### Tyranitar (Basic cluster)
- Dark Pulse: `it hit's` (×2); `the users piercing`
- Rock Polish: `it hit's` (×2); `the users Attack`
- Ancient Power: `the users movement`; `the users piercing`; `this move hit's` (×2); `it'self`
- Sand Tomb: `it hit's`; `while the user in the cloud` (missing **is**)
- Stone Edge: `3 time(s)`
- Tyrannical Rampage: `it's movement`; `it's basic attack pattern`

### Umbreon
- Anticipation Basic: `left unabled to act` → unable
- Snarl Advanced: `Becomes hindrance resistant and begin snarling` → begins

### Urshifu
- Wicked Blow Advanced: `the enemies missing HP` → enemies'; `Wild Pokemon` (twice)

### Vaporeon
- Flip Turn Basic: `dirrection` → direction
- Flip Turn Advanced: `whiile cloaked` → while
- Swift Advanced: `Has the user shoots` → shoot
- Aqua Ring Advanced: `any ally Pokémon … gains a buff` → gain

### Wigglytuff
- Starlight Recital Basic: `removing … and make them immune` → making
- Cute Charm Basic: `an enemies attack` → an enemy's attack

### Zacian
- Metal Claw Basic starts `as the user release a shock wave` (truncated “Has the user…”)
- Slash Advanced: `slows of Pokémon hit` → slows; missing `it` before `deals increased damage`
- Sovereign Sword Advanced: `Has the user ready … and then unleashes` → unleash

### Zapdos
- Discharge Advanced: `preceeding waves` → preceding

### Zoroark
- Attack Advanced: `Becomes a boosted with every third attack` → boosted attack

---

## Already fixed (still clean — not open)

`movemenr`, `oppposing`, `intial`, `deacrease`, `damge`, `attakck`, `nulliffied`, `Thundershock`, `shadoww`, `isnide`, `speeed`, `hitos`, `pases`, `can the be`, `the project deals`, `damage-over time`, Ho-Oh / Chikorita / Lumière casing, plus live `patch_note_overrides.json` sentence fixes (Crustle 2s→3s, Sylveon/Mew/Ho-Oh periods, Dodrio projectile, Gardevoir hyphen, Latias then).

---

## How to correct (when you want a pass)

Do not hand-edit `patch-current.json`. Route:

1. **Safe global words** (`uanble`, `guage`, `gauage`, `disatance`, `othr`, `oppsing`, `blasing`, `rapdily`, `psychich`, `forawrd`, `dirrection`, `whiile`, `bcomes`, `efffect`, `recoves`, `unabled`, `illusary`, `targetted`, `preceeding`, `inititally`, `Meowsacarda`, `Solagaleo`, `Pokmon`, `Pokémn`, `Hinderances`) → `SPELLING_FIXES` in `tools/community/normalize.py` + banned fragments in `patchBundle.test.ts`.
2. **Sentence-specific** (`munable`, `itsm ovement`, `comet s`, `{0}`, `hit's`, `\u201ccoached\u201d`, glued `times.If`, cut-off Psyduck Disable) → guarded `replaceText` in `patch_note_overrides.json`.
3. **`{0}` values** must come from Advanced or in-game (don’t guess).
