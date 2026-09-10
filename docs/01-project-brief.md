# Project Brief: Pokémon UNITE Build Optimizer

**Superseded by [`AGENTS.md`](../AGENTS.md).** This file is the original v1 sketch (`computeStats()` as the UI path, battle items out of scope, suggested folders). Do not treat it as the live architecture.

## Overview  
  
A personal web tool that helps Pokémon UNITE players — from casual to  
competitive — design optimized builds. The user selects a Pokémon, and the tool  
recommends complementary Emblem loadouts and Held Items based on that Pokémon's  
stats, moves, abilities, and how those elements interact. The experience should  
be visually rich (Pokémon art, item/emblem icons) and simple enough for a  
complete newcomer to use.  
  
## Core Features  
  
1. **Pokémon selection** with a complete data model for each: base stats across  
   all levels (1–15), move/ability descriptions, and the mechanical effects of  
   each move (expressed in a structured format like the RSB — Ratio/Slider/Base —  
   damage system).  
  
2. **Build recommendation engine** that assembles Emblem loadouts and  
   complementary Held Items tailored to the selected Pokémon, accounting for  
   stat priorities (physical vs. special attacker), set-bonus thresholds, and  
   item/emblem/move synergies.  
  
3. **Real-time stat calculation** that updates a Pokémon's final stats live as  
   the user swaps emblems and held items, correctly applying the game's stacking  
   order (base stat → emblem flats → emblem set %, then held-item flats and  
   conditional effects).  
  
4. **Level scalability visualization** — a level slider and/or graph showing how  
   the chosen build's stats evolve from level 1 to 15, so users can see  
   breakpoints and power spikes for any emblem/item combination.  
  
## Design Priorities  
  
- **Accessibility first** — clean UI, visual icons, minimal jargon, sensible  
  defaults for casual users, with depth available for advanced users.  
- **Accuracy** — calculations must mirror in-game behavior exactly, including  
  rounding rules and stacking order.  
- **Maintainability** — game data lives in editable data files (not hardcoded)  
  so patches can be applied without rewriting logic.  
  
## Out of Scope (for v1)  
  
- Battle items (X Attack, Eject Button) — design the schema to allow them later.  
- Team composition / draft suggestions.  
- Live match integration.  
