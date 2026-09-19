# Calculation Engine  
  
This is the heart of the tool. The stacking order and the percent-HP / in-combat  
flags are the details most likely to cause subtle bugs, so they're spelled out  
explicitly here.  
  
## Stacking Order (NON-NEGOTIABLE)  
  
Apply in exactly this sequence to match in-game behavior:  
  
1. **Base stat** at the given level (`baseStatsByLevel[level - 1]`).  
2. **Emblem flat totals**, summed across all 10 emblems, then rounded using  
   **standard rounding** (e.g. 18.6 → 19, 18.4 → 18). Emblem flats are the only  
   place standard rounding applies; most other game math truncates.  
3. **Emblem set-bonus percentages**, applied to **(base + emblem flats)**.  
   - e.g. 6 Brown = +4% Attack, applied to `(baseAtk + emblemFlatAtk)`.  
4. **Held-item flat stats** — added AFTER emblem percentages. These are NOT  
   multiplied by emblem set bonuses.  
5. **Conditional item effects** per context (Attack Weight stacks per goal,  
   Float Stone OOC move speed, Muscle Band on-hit, etc.).  
  
> If you apply held-item flats before the emblem %, or multiply item flats by the  
> emblem bonus, your numbers will be wrong. This is the most common inaccuracy in  
> third-party tools.  
  
## Set-Bonus Thresholds  
  
| Color | Stat | Thresholds |  
|---|---|---|  
| Brown | Attack | 2:+1%, 4:+2%, 6:+4% |  
| Green | Sp. Atk | 2:+1%, 4:+2%, 6:+4% |  
| Blue | Defense | 2:+2%, 4:+4%, 6:+8% |  
| Purple | Sp. Def | 2:+2%, 4:+4%, 6:+8% |  
| White | HP | 2:+1%, 4:+2%, 6:+4% |  
| Red | Atk Speed | 3:+2%, 5:+4%, 7:+8% |  
| Yellow | Move Speed (OOC) | 3:+4%, 5:+6%, 7:+12% |  
| Black | CDR | 3:+2%, 5:+4%, 7:+8% |  
| Pink | Hindrance reduction | 3:-4%, 5:-8%, 7:-16% |  
| Navy | Unite Move gauge time | 3/5/7 utility; no StatBlock effect |
| Gray | Flat received damage | 3/5/7 utility (`−3 / −6 / −12`); no StatBlock effect |  
  
- Only one emblem per Pokémon counts toward a color set (duplicates of the same  
  Pokémon at different grades count once).  
- Platinum emblems use the same stat values as Gold (cosmetic upgrade only).  
  
## Key Flags  
  
- **`isPercentMaxHp` / `isPercentHp`** — damage that scales with max/current HP  
  (e.g. Muscle Band). This BYPASSES effective-HP scaling and is mitigated as a  
  separate damage instance through the defense formula. Essential for accurate  
  matchup math.  
- **`appliesInCombat`** — distinguishes effects like Float Stone's move-speed  
  bonus, which only applies OUT of combat. Matters for the level-scaling viz and  
  for showing in-combat vs. out-of-combat speed.  
  
## Validation Targets  
  
Before building UI, confirm the engine reproduces these (from real in-game data):  
  
- **Lucario Lv 15 base:** HP 7249, Atk 429, Def 390, SpAtk 115, SpDef 300,  
  Crit 20%, Atk Speed 40%, Move Speed 4300.  
- **Emblem rounding:** a loadout totaling 18.6 flat Attack displays/uses 19.  
- **6 Brown bonus** multiplies (base Atk + emblem flat Atk), then held-item flat  
  Attack is added after.  
- **Held item example (Grade 40):** Float Stone = +175 Move Speed, +28 Attack,  
  +20% OOC move speed. (Verify all item values against current in-game data;  
  third-party sites are often stale.)  
