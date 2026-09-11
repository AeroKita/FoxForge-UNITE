# In-game Basic tooltip stills

Drop English **Basic-mode** Passive and Move screenshots into the Pokémon folder. Images stay gitignored. `SKILLS.txt` is the capture checklist.

**Do not capture Attack / basic attack.** Advanced-mode numbers stay UNITE-DB.

The yellow banner **Once you reach Lv. N** and `SKILLS.txt` chips like `(Lv 4)` are the **learn** level. The still's Upgrade paragraph is usually a bare `Upgrade:` with no number. Archive `Upgrade (Level N):` uses UNITE-DB `level2` or the number already in `move_descriptions.json` (often 10/11/12/13). Do not copy the learn chip into that N.

## Naming

Match `SKILLS.txt`:

- `blaze.png`, `flame-burst.png`, `aura-cannon.png`
- Long tooltips that need more than one still: `power-up-punch-2.png`, `power-up-punch-3.png`
- PNG, JPEG, or HEIC are all fine. iPhone `IMG_1234.JPG` also works if the filename is unclear — say which skill it is when you hand the folder over.

## After stills land

Transcribe into `tools/community/move_descriptions.json`, lock keys in `operator_in_game_basic.json`, then:

```bash
npm run data:refresh -- --mode curate --patch-version 1.24.1.4 --no-verify
npm run test:tools && npm run verify
```
