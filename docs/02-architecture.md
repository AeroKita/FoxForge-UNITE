# Architecture

**Superseded by [`AGENTS.md`](../AGENTS.md).** This file is the original v1 sketch (suggested folders, `computeStats()` as the UI path). Do not treat it as the live architecture.

## Recommended Stack  
  
| Layer | Choice | Rationale |  
|---|---|---|  
| UI framework | React | Live-updating stat panels as emblems/items change |  
| Charting | Recharts | Level-scaling graph (stats vs. level 1–15) |  
| State | React state / reducer | Recalculate effective stats on every change |  
| Data | JSON bundles keyed by patch version | Patchable without code changes |  
| Styling | Your preference (Tailwind works well) | Icon-rich, accessible UI |  
  
## Project Structure (suggested)  
src/
├── data/                  # versioned game-data bundles (JSON)
│   └── patch-1.2.3.4.json
├── engine/
│   ├── computeStats.ts    # stacking-order stat calculation
│   ├── formulas.ts        # pure damage/defense/eHP functions
│   └── recommend.ts       # build recommendation logic
├── components/
│   ├── PokemonPicker/
│   ├── EmblemLoadout/
│   ├── HeldItemSelector/
│   ├── StatPanel/         # live effective-stats display
│   └── LevelGraph/        # Recharts level-scaling viz
└── types.ts               # schema (see schema/types.ts)

## Data Flow

1. User selects Pokémon → load base stats by level.
2. User edits emblem loadout + held items → state updates.
3. `computeStats()` runs on every change, for the selected level.
4. `StatPanel` shows live effective stats; `LevelGraph` shows all 15 levels.
5. `recommend()` can suggest loadouts; selecting one populates the loadout state.

## Build Order (for implementation)

1. **Engine first.** `formulas.ts` + `computeStats.ts`, validated against known
   examples (see calculation engine doc).
2. **Data layer.** Load and validate a patch bundle.
3. **Core UI.** Pokémon picker → loadout editor → live stat panel.
4. **Visualization.** Level slider + graph.
5. **Recommendation engine.** Start rule-based; refine later.