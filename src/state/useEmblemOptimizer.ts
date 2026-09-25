import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./store";
import { ownedForOptimizer } from "./optimizerVisibility";
import type { EmblemPick } from "./loadout";
import { emblems as allEmblems, setBonuses, pokemonById, pokemonList } from "../data/gameData";
import {
  buildPool,
  approximateBuildCount,
  countConstrainedBuilds,
  countExactEnumerationSpace,
  distinctPokemonCount,
} from "../engine/emblemSearch/pool";
import { colorGroupSizes } from "../engine/emblemSearch/exactColor";
import { DEFAULT_EXACT_CAP, shouldRunExact } from "../engine/emblemSearch/orchestrator";
import {
  proposedColorBonuses,
  type ColorBonusPreviewItem,
} from "../engine/emblemSearch/colorBonusPreview";
import { useEmblemSearch, buildSearchSettingsKey, DEFAULT_RESULT_COUNT } from "./emblemSearch";
import { priorityWeights } from "../engine/recommend";
import {
  deriveBasicObjective,
  buildBasicPool,
  BASIC_POOL_DEFAULTS,
  DEFAULT_ALLOWED_GRADES,
} from "../engine/emblemSearch/basicObjective";
import {
  buildPresetSearchOptions,
  colorTargetsFromUi,
  deriveAdvancedColorUiDefaults,
  isExactColorModeFeasible,
  resolveBasicSearchParams,
  resolveColorSearchMode,
  type BasicEffort,
} from "../engine/emblemSearch/searchPresets";
import { deriveProtectFloors } from "../engine/emblemSearch/protectDefaults";
import {
  presetPriorities,
  presetProtectFloors,
  resolveEmblemPreset,
} from "../engine/emblemSearch/optimizerPresets";
import { predictFlatStatRanges } from "../engine/emblemSearch/predictStats";
import type {
  PokemonScoringContext,
  SearchOptions,
  SearchMode,
  PoolConfig,
} from "../engine/emblemSearch/types";
import type { EmblemColor, EmblemGrade, StatBlock } from "../types";
import {
  CONSTRAINT_COLORS,
  emblemPicksFromResult,
  SLOTS,
  type AppliedState,
  type ColorMode,
  type Effort,
  type OptimizerAdvancedProps,
  type OptimizerBasicProps,
  type OptimizerSharedProps,
} from "../components/optimizer/shared";

export function useEmblemOptimizer(active: boolean): {
  shared: OptimizerSharedProps;
  basic: OptimizerBasicProps;
  advanced: OptimizerAdvancedProps;
} {
  const { loadout, dispatch, owned, expert } = useStore();
  const shownOwnedRef = useRef(owned);
  const shownOwned = ownedForOptimizer(active, owned, shownOwnedRef.current);
  shownOwnedRef.current = shownOwned;
  const pokemon = loadout.pokemonId ? (pokemonById.get(loadout.pokemonId) ?? null) : null;

  const [basicUseOwned, setBasicUseOwned] = useState(BASIC_POOL_DEFAULTS.useOwned);
  const [useOwned, setUseOwned] = useState(BASIC_POOL_DEFAULTS.useOwned);
  const [mixedGrades, setMixedGrades] = useState(BASIC_POOL_DEFAULTS.mixedGrades);
  const [allowedGrades, setAllowedGrades] = useState<Set<EmblemGrade>>(
    () => new Set(DEFAULT_ALLOWED_GRADES),
  );
  const [mode, setMode] = useState<SearchMode>("maximize");
  const [effort, setEffort] = useState<Effort>("normal");
  const [basicEffort, setBasicEffort] = useState<BasicEffort>("normal");
  const [colorBonuses, setColorBonuses] = useState(true);
  const [optimizeLevel, setOptimizeLevel] = useState<number>(15);
  const [pokemonAwareScoring, setPokemonAwareScoring] = useState(true);
  const [customWeights, setCustomWeights] = useState<Record<string, number>>({});
  const [colorMode, setColorMode] = useState<ColorMode>("off");
  const [colorCounts, setColorCounts] = useState<Record<EmblemColor, number>>(
    Object.fromEntries(CONSTRAINT_COLORS.map((c) => [c, 0])) as Record<EmblemColor, number>,
  );
  const [activeColors, setActiveColors] = useState<Set<EmblemColor>>(new Set());
  const [targetValues, setTargetValues] = useState<Record<string, string>>({});
  const [targetActive, setTargetActive] = useState<Record<string, boolean>>({});
  const [floorActive, setFloorActive] = useState<Record<string, boolean>>({});
  const [floorValues, setFloorValues] = useState<Record<string, string>>({});
  const [exactCap, setExactCap] = useState<number>(DEFAULT_EXACT_CAP);
  const [resultCount, setResultCount] = useState(DEFAULT_RESULT_COUNT);

  const poolConfig = useMemo<PoolConfig>(
    () => ({ useOwned, mixedGrades, allowedGrades }),
    [useOwned, mixedGrades, allowedGrades],
  );
  const pool = useMemo(
    () => buildPool(allEmblems, poolConfig, shownOwned),
    [poolConfig, shownOwned],
  );
  const buildCount = useMemo(() => approximateBuildCount(pool, SLOTS), [pool]);
  const candidateCount = pool.length;
  const poolDistinctNames = useMemo(() => distinctPokemonCount(pool), [pool]);

  // An inventory held at a single grade contributes one variant per Pokémon,
  // so there are no grades to mix and the grade-aware search would re-derive
  // the same builds. The engine guards this too (shouldEnumerateGrades); this
  // keeps the displayed search method honest.
  const enumerateGradeVariants = mixedGrades && candidateCount > poolDistinctNames;

  const basicPoolConfig = useMemo<PoolConfig>(
    () => ({
      useOwned: basicUseOwned,
      mixedGrades: BASIC_POOL_DEFAULTS.mixedGrades,
      allowedGrades,
    }),
    [basicUseOwned, allowedGrades],
  );
  const basicPool = useMemo(
    () => buildBasicPool(allEmblems, shownOwned, basicPoolConfig),
    [shownOwned, basicPoolConfig],
  );

  const basicNotEnoughEmblems = basicPool.length < SLOTS;
  const advancedNotEnoughEmblems = pool.length < SLOTS;

  const basicEnumerateGradeVariants = useMemo(
    () => BASIC_POOL_DEFAULTS.mixedGrades && basicPool.length > distinctPokemonCount(basicPool),
    [basicPool],
  );

  const basicObjective = useMemo(() => {
    if (!pokemon) return null;
    return deriveBasicObjective(
      pokemon,
      optimizeLevel,
      allEmblems,
      pokemonList,
      resolveEmblemPreset(pokemon)?.preset ?? null,
    );
  }, [pokemon, optimizeLevel]);

  const basicColorResolution = useMemo(() => {
    if (!basicObjective) return null;
    return resolveColorSearchMode(
      basicPool,
      basicObjective.colorTargets as Map<EmblemColor, number>,
      SLOTS,
      basicEnumerateGradeVariants,
    );
  }, [basicObjective, basicPool, basicEnumerateGradeVariants]);

  const basicExactColorFeasible = basicColorResolution?.mode === "exact";
  const basicExactEnumFeasible = basicColorResolution?.willRunExact ?? false;

  const basicSearchParams = useMemo(
    () => resolveBasicSearchParams(basicEffort, basicColorResolution),
    [basicEffort, basicColorResolution],
  );
  const { displayEffort: resolvedBasicEffort, willRunExact: basicWillRunExactSearch } =
    basicSearchParams;

  const emblemPresetResolution = useMemo(
    () => (pokemon ? resolveEmblemPreset(pokemon) : null),
    [pokemon],
  );
  const defaultWeights = useMemo(() => {
    if (!pokemon) return {};
    return emblemPresetResolution
      ? presetPriorities(emblemPresetResolution.preset)
      : priorityWeights(pokemon);
  }, [pokemon, emblemPresetResolution]);
  const priorities = useMemo(
    () => ({ ...defaultWeights, ...customWeights }),
    [defaultWeights, customWeights],
  );

  const flatStatPredictionByStat = useMemo(() => {
    const m = new Map<
      keyof StatBlock,
      import("../engine/emblemSearch/predictStats").FlatStatPrediction
    >();
    if (mode !== "maximize") return m;
    let targets: Map<EmblemColor, number> | undefined;
    if (colorMode !== "off" && activeColors.size > 0) {
      targets = new Map<EmblemColor, number>();
      for (const col of activeColors) {
        const n = colorCounts[col] ?? 0;
        if (n > 0) targets.set(col, n);
      }
    }
    const alsoReport = (Object.entries(floorActive) as [keyof StatBlock, boolean][])
      .filter(([, active]) => active)
      .map(([stat]) => stat);
    for (const p of predictFlatStatRanges(pool, priorities, 20, targets, alsoReport)) {
      m.set(p.stat, p);
    }
    return m;
  }, [mode, pool, priorities, colorMode, activeColors, colorCounts, floorActive]);

  const pokemonContext = useMemo((): PokemonScoringContext | undefined => {
    if (!pokemon || !pokemonAwareScoring) return undefined;
    const baseStats = pokemon.baseStatsByLevel[optimizeLevel - 1];
    if (!baseStats) return undefined;
    return { pokemonId: pokemon.id, level: optimizeLevel, baseStats };
  }, [pokemon, optimizeLevel, pokemonAwareScoring]);

  const colorConstraints: Map<EmblemColor, number> | null = useMemo(() => {
    if (colorMode !== "exact" || activeColors.size === 0) return null;
    const m = new Map<EmblemColor, number>();
    for (const col of activeColors) m.set(col, colorCounts[col] ?? 0);
    return m;
  }, [colorMode, activeColors, colorCounts]);

  const totalColorConstrained = useMemo(
    () => [...(colorConstraints?.values() ?? [])].reduce((a, b) => a + b, 0),
    [colorConstraints],
  );

  const colorCapacities = useMemo(() => colorGroupSizes(pool), [pool]);

  const colorConstraintValid = useMemo(() => {
    if (!colorConstraints) return true;
    if (totalColorConstrained > 2 * SLOTS) return false;
    for (const [col, need] of colorConstraints) {
      const cap = Math.min(SLOTS, colorCapacities.get(col) ?? 0);
      if (need > cap) return false;
    }
    return true;
  }, [colorConstraints, totalColorConstrained, colorCapacities]);

  const constrainedBuildCount = useMemo(() => {
    if (!colorConstraints || !colorConstraintValid) return null;
    return countConstrainedBuilds(pool, colorConstraints, SLOTS);
  }, [pool, colorConstraints, colorConstraintValid]);

  const exactEnumerationCount = useMemo(() => {
    if (!colorConstraints || !colorConstraintValid) return null;
    return countExactEnumerationSpace(pool, colorConstraints, SLOTS, enumerateGradeVariants);
  }, [pool, colorConstraints, colorConstraintValid, enumerateGradeVariants]);

  const willRunExact = useMemo(() => {
    if (colorMode !== "exact" || !colorConstraints || !colorConstraintValid) return false;
    return shouldRunExact(exactEnumerationCount, exactCap);
  }, [colorMode, colorConstraints, colorConstraintValid, exactEnumerationCount, exactCap]);

  const searchWillRunExact = expert ? willRunExact : basicWillRunExactSearch;
  const effectiveResultCount = searchWillRunExact ? 1 : resultCount;

  const colorBonusPreviews = useMemo<ColorBonusPreviewItem[]>(() => {
    if (colorMode === "off" || activeColors.size === 0) return [];
    const counts = new Map<EmblemColor, number>();
    for (const col of activeColors) {
      const n = colorCounts[col] ?? 0;
      if (n > 0) counts.set(col, n);
    }
    return proposedColorBonuses(counts, setBonuses);
  }, [colorMode, activeColors, colorCounts]);

  /** Whether hard exact color constraints are achievable on the current pool. */
  const exactColorModeFeasible = useMemo(() => {
    let targets = colorTargetsFromUi(activeColors, colorCounts);
    if (targets.size === 0 && pokemon) {
      const defaults = deriveAdvancedColorUiDefaults(pokemon, pool, allEmblems);
      targets = new Map(
        defaults.activeColors.map((c) => [c, defaults.colorCounts.get(c) ?? 0] as const),
      );
    }
    if (targets.size === 0) return false;
    return isExactColorModeFeasible(pool, targets, SLOTS, enumerateGradeVariants);
  }, [activeColors, colorCounts, pokemon, pool, enumerateGradeVariants]);

  const advancedSearchOptions: SearchOptions = useMemo(
    () => ({
      mode,
      priorities: mode === "maximize" ? priorities : {},
      targets: Object.fromEntries(
        Object.entries(targetValues)
          .filter(([k]) => targetActive[k])
          .map(([k, v]) => [k, parseFloat(v) || 0]),
      ),
      targetActive,
      protected: Object.fromEntries(
        Object.entries(floorValues)
          .filter(([k]) => floorActive[k])
          .map(([k, v]) => [k, parseFloat(v) || 0]),
      ),
      colorConstraints,
      colorBonuses: colorMode === "weighted" ? true : colorBonuses,
      scoringMode: pokemonAwareScoring && pokemon ? "pokemon" : "classic",
      pokemonContext,
      slots: SLOTS,
      exactCap,
      enumerateGradeVariants,
    }),
    [
      mode,
      priorities,
      targetValues,
      targetActive,
      floorValues,
      floorActive,
      colorConstraints,
      colorMode,
      colorBonuses,
      pokemonAwareScoring,
      pokemon,
      pokemonContext,
      exactCap,
      enumerateGradeVariants,
    ],
  );

  const { state: searchState, run, cancel, clearResult, goHistory } = useEmblemSearch();

  const searchSettingsKey = useMemo(
    () =>
      buildSearchSettingsKey({
        pokemonId: loadout.pokemonId,
        optimizeLevel,
        basicUseOwned,
        useOwned,
        mixedGrades,
        allowedGrades: [...allowedGrades].sort(),
        basicEffort: resolvedBasicEffort,
        effort,
        colorBonuses,
        pokemonAwareScoring,
        exactCap,
        mode,
        customWeights,
        targetValues,
        targetActive,
        floorValues,
        floorActive,
        colorMode,
        activeColors: [...activeColors].sort(),
        colorCounts,
        ownedKeys: [...shownOwned].sort(),
        resultCount,
      }),
    [
      loadout.pokemonId,
      optimizeLevel,
      basicUseOwned,
      useOwned,
      mixedGrades,
      allowedGrades,
      resolvedBasicEffort,
      effort,
      colorBonuses,
      pokemonAwareScoring,
      exactCap,
      mode,
      customWeights,
      targetValues,
      targetActive,
      floorValues,
      floorActive,
      colorMode,
      activeColors,
      colorCounts,
      shownOwned,
      resultCount,
    ],
  );

  const prevPokemonIdRef = useRef(loadout.pokemonId);
  useEffect(() => {
    if (searchState.status === "running") return;
    if (prevPokemonIdRef.current !== loadout.pokemonId) {
      prevPokemonIdRef.current = loadout.pokemonId;
      clearResult();
    }
  }, [loadout.pokemonId, searchState.status, clearResult]);

  const resultPicks = useMemo(
    () => emblemPicksFromResult(searchState.result),
    [searchState.result],
  );

  const [applied, setApplied] = useState<AppliedState>({ emblems: false });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    setApplied({ emblems: false });
  }, [searchState.result, searchState.historyIndex]);

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const applyEmblemsToLoadout = useCallback(
    (emblems: EmblemPick[]) => {
      if (!emblems.length) return;
      dispatch({ type: "applyBuild", emblems });
      setApplied({ emblems: true });
      showToast(
        `Applied ${emblems.length} emblem${emblems.length !== 1 ? "s" : ""} to your loadout.`,
      );
    },
    [dispatch, showToast],
  );

  const handleApplyEmblems = useCallback(() => {
    applyEmblemsToLoadout(resultPicks ?? []);
  }, [applyEmblemsToLoadout, resultPicks]);

  const loadoutPokemonIdRef = useRef(loadout.pokemonId);
  loadoutPokemonIdRef.current = loadout.pokemonId;
  const activeColorsRef = useRef(activeColors);
  activeColorsRef.current = activeColors;
  const colorCountsRef = useRef(colorCounts);
  colorCountsRef.current = colorCounts;
  const colorModeRef = useRef(colorMode);
  colorModeRef.current = colorMode;
  const enumerateGradeVariantsRef = useRef(enumerateGradeVariants);
  enumerateGradeVariantsRef.current = enumerateGradeVariants;
  /** User chose Weighted while Exact was available — blocks pool-driven auto-upgrade. */
  const userPinnedWeightedRef = useRef(false);
  const exactColorModeFeasibleRef = useRef(false);
  /** Previous pool exact-feasibility for the current color targets (pool effect only). */
  const prevExactFeasibleRef = useRef<boolean | null>(null);
  // Refs so pokemon-change reset uses the latest pool/level without re-binding when
  // owned/full or grade filters change (those must never trigger a settings reset).
  const poolConfigRef = useRef(poolConfig);
  const ownedRef = useRef(owned);
  const optimizeLevelRef = useRef(optimizeLevel);
  poolConfigRef.current = poolConfig;
  ownedRef.current = owned;
  optimizeLevelRef.current = optimizeLevel;
  exactColorModeFeasibleRef.current = exactColorModeFeasible;

  const applyAdvancedColorDefaults = useCallback((targetPool: typeof pool) => {
    const p = loadoutPokemonIdRef.current
      ? (pokemonById.get(loadoutPokemonIdRef.current) ?? null)
      : null;
    const defaults = deriveAdvancedColorUiDefaults(p, targetPool, allEmblems);
    const nextColors = new Set(defaults.activeColors);
    const nextCounts = Object.fromEntries(
      CONSTRAINT_COLORS.map((c) => [c, defaults.colorCounts.get(c) ?? 0]),
    ) as Record<EmblemColor, number>;
    setColorMode(defaults.colorMode);
    setActiveColors(nextColors);
    setColorCounts(nextCounts);
    activeColorsRef.current = nextColors;
    colorCountsRef.current = nextCounts;
    colorModeRef.current = defaults.colorMode;
    userPinnedWeightedRef.current = false;
    const targets = colorTargetsFromUi(nextColors, nextCounts);
    prevExactFeasibleRef.current =
      targets.size > 0
        ? isExactColorModeFeasible(targetPool, targets, SLOTS, enumerateGradeVariantsRef.current)
        : null;
  }, []);

  /** Fill preset color targets when the user enables colors but seeding was skipped. */
  const seedColorTargetsIfEmpty = useCallback(() => {
    if (activeColorsRef.current.size > 0) return;
    const p = loadoutPokemonIdRef.current
      ? (pokemonById.get(loadoutPokemonIdRef.current) ?? null)
      : null;
    if (!p) return;
    const currentPool = buildPool(allEmblems, poolConfigRef.current, ownedRef.current);
    const defaults = deriveAdvancedColorUiDefaults(p, currentPool, allEmblems);
    if (defaults.activeColors.length === 0) return;
    const nextColors = new Set(defaults.activeColors);
    const nextCounts = Object.fromEntries(
      CONSTRAINT_COLORS.map((c) => [c, defaults.colorCounts.get(c) ?? 0]),
    ) as Record<EmblemColor, number>;
    setActiveColors(nextColors);
    setColorCounts(nextCounts);
    activeColorsRef.current = nextColors;
    colorCountsRef.current = nextCounts;
    const targets = colorTargetsFromUi(nextColors, nextCounts);
    prevExactFeasibleRef.current = isExactColorModeFeasible(
      currentPool,
      targets,
      SLOTS,
      enumerateGradeVariantsRef.current,
    );
  }, []);

  const handleSetColorMode = useCallback(
    (mode: ColorMode) => {
      if (mode === "exact" && !exactColorModeFeasibleRef.current) return;
      if (mode === "weighted" && colorModeRef.current === "exact") {
        userPinnedWeightedRef.current = true;
      } else if (mode === "exact" || mode === "off") {
        userPinnedWeightedRef.current = false;
        if (mode === "off") prevExactFeasibleRef.current = null;
      }
      setColorMode(mode);
      if (mode !== "off") seedColorTargetsIfEmpty();
    },
    [seedColorTargetsIfEmpty],
  );

  const applyAdvancedProtectDefaults = useCallback(
    (level: number) => {
      if (pokemon) {
        const resolved = resolveEmblemPreset(pokemon);
        const floors = resolved
          ? presetProtectFloors(pokemon, resolved.preset)
          : deriveProtectFloors(pokemon, pokemonList, level);
        const newFloorActive: Record<string, boolean> = {};
        const newFloorValues: Record<string, string> = {};
        for (const stat of Object.keys(floors)) {
          newFloorActive[stat] = true;
          newFloorValues[stat] = String((floors as Record<string, number>)[stat] ?? 0);
        }
        setFloorActive(newFloorActive);
        setFloorValues(newFloorValues);
      } else {
        setFloorActive({});
        setFloorValues({});
      }
    },
    [pokemon],
  );

  /** Pokémon-specific defaults: colors, protect floors, custom priority tweaks. */
  const resetAdvancedForNewPokemon = useCallback(() => {
    setCustomWeights({});
    applyAdvancedProtectDefaults(optimizeLevelRef.current);
    const currentPool = buildPool(allEmblems, poolConfigRef.current, ownedRef.current);
    applyAdvancedColorDefaults(currentPool);
  }, [applyAdvancedProtectDefaults, applyAdvancedColorDefaults]);

  /** Full Advanced reset — pool, mode, scoring toggles, colors, floors (Reset button). */
  const syncAdvancedFromBasic = useCallback(() => {
    const grades = new Set(DEFAULT_ALLOWED_GRADES);
    setUseOwned(BASIC_POOL_DEFAULTS.useOwned);
    setMixedGrades(BASIC_POOL_DEFAULTS.mixedGrades);
    setAllowedGrades(grades);
    setMode("maximize");
    setColorBonuses(true);
    setPokemonAwareScoring(true);
    setCustomWeights({});
    setExactCap(DEFAULT_EXACT_CAP);

    applyAdvancedProtectDefaults(optimizeLevel);

    const defaultPool = buildPool(
      allEmblems,
      {
        useOwned: BASIC_POOL_DEFAULTS.useOwned,
        mixedGrades: BASIC_POOL_DEFAULTS.mixedGrades,
        allowedGrades: grades,
      },
      owned,
    );
    applyAdvancedColorDefaults(defaultPool);
  }, [optimizeLevel, owned, applyAdvancedProtectDefaults, applyAdvancedColorDefaults]);

  const prevExpert = useRef(false);
  const prevPokemonIdForExpert = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!expert || !pokemon) {
      prevExpert.current = expert;
      return;
    }

    const expertJustEnabled = expert && !prevExpert.current;
    const pokemonChanged = prevPokemonIdForExpert.current !== loadout.pokemonId;
    prevExpert.current = expert;
    prevPokemonIdForExpert.current = loadout.pokemonId;

    // Seed Advanced defaults on first entry or Pokémon change — not on pool toggles.
    if (expertJustEnabled || pokemonChanged) resetAdvancedForNewPokemon();
  }, [expert, loadout.pokemonId, pokemon, resetAdvancedForNewPokemon]);

  // Pool change: auto-upgrade Weighted → Exact when feasible; downgrade Exact when not.
  useLayoutEffect(() => {
    if (!active) return;
    if (!expert || colorMode === "off" || activeColorsRef.current.size === 0) {
      prevExactFeasibleRef.current = null;
      return;
    }

    const targets = colorTargetsFromUi(activeColorsRef.current, colorCountsRef.current);
    if (targets.size === 0) return;

    const exactFeasible = isExactColorModeFeasible(
      pool,
      targets,
      SLOTS,
      enumerateGradeVariantsRef.current,
    );

    if (colorMode === "exact" && !exactFeasible) {
      setColorMode("weighted");
    } else if (
      colorMode === "weighted" &&
      exactFeasible &&
      prevExactFeasibleRef.current === false &&
      !userPinnedWeightedRef.current
    ) {
      setColorMode("exact");
    }

    prevExactFeasibleRef.current = exactFeasible;
  }, [active, expert, colorMode, poolConfig, shownOwned, enumerateGradeVariants, pool]);

  const handleBasicSearch = useCallback(async () => {
    if (!pokemon || !basicObjective || basicPool.length < SLOTS) return;
    const {
      forceHeuristic,
      heuristicEffort,
      exactCap: basicExactCap,
    } = resolveBasicSearchParams(basicEffort, basicColorResolution);
    const { options } = buildPresetSearchOptions({
      pokemon,
      level: optimizeLevel,
      pool: basicPool,
      emblems: allEmblems,
      pokemonList,
      forceHeuristic,
      exactCap: basicExactCap,
      enumerateGradeVariants: basicEnumerateGradeVariants,
    });
    await run(
      basicPool,
      options,
      setBonuses,
      heuristicEffort as Effort,
      searchSettingsKey,
      effectiveResultCount,
    );
  }, [
    pokemon,
    basicObjective,
    basicPool,
    basicColorResolution,
    basicEnumerateGradeVariants,
    optimizeLevel,
    basicEffort,
    run,
    searchSettingsKey,
    effectiveResultCount,
  ]);

  const handleAdvancedSearch = useCallback(async () => {
    if (advancedNotEnoughEmblems) return;
    await run(
      pool,
      advancedSearchOptions,
      setBonuses,
      effort,
      searchSettingsKey,
      effectiveResultCount,
    );
  }, [
    advancedNotEnoughEmblems,
    pool,
    advancedSearchOptions,
    effort,
    run,
    searchSettingsKey,
    effectiveResultCount,
  ]);

  const hasResult =
    (searchState.status === "done" || searchState.status === "cancelled") && !!resultPicks?.length;

  const historyCount = searchState.history.length;
  const historyIndex = searchState.historyIndex >= 0 ? searchState.historyIndex : 0;

  const shared: OptimizerSharedProps = {
    pokemon,
    searchState,
    resultPicks,
    hasResult,
    historyCount,
    historyIndex,
    goHistory,
    clearResult,
    handleApplyEmblems,
    applied,
    optimizeLevel,
    setOptimizeLevel,
    cancel,
    toast,
    searchWillRunExact,
    resultCount,
    setResultCount,
    allowedGrades,
    setAllowedGrades,
  };

  const basic: OptimizerBasicProps = {
    basicUseOwned,
    setBasicUseOwned,
    basicEffort,
    setBasicEffort,
    basicPool,
    basicNotEnoughEmblems,
    resolvedBasicEffort,
    basicExactColorFeasible,
    basicExactEnumFeasible,
    basicWillRunExactSearch,
    handleBasicSearch,
  };

  const advanced: OptimizerAdvancedProps = {
    pool,
    useOwned,
    setUseOwned,
    mixedGrades,
    setMixedGrades,
    enumerateGradeVariants,
    mode,
    setMode,
    effort,
    setEffort,
    exactCap,
    setExactCap,
    colorMode,
    setColorMode: handleSetColorMode,
    exactColorModeFeasible,
    activeColors,
    setActiveColors,
    colorCounts,
    setColorCounts,
    colorBonuses,
    setColorBonuses,
    pokemonAwareScoring,
    setPokemonAwareScoring,
    customWeights,
    setCustomWeights,
    targetValues,
    setTargetValues,
    targetActive,
    setTargetActive,
    floorValues,
    setFloorValues,
    floorActive,
    setFloorActive,
    advancedNotEnoughEmblems,
    buildCount,
    candidateCount,
    poolDistinctNames,
    colorConstraints,
    colorConstraintValid,
    constrainedBuildCount,
    exactEnumerationCount,
    willRunExact,
    colorCapacities,
    totalColorConstrained,
    colorBonusPreviews,
    emblemPresetResolution,
    priorities,
    flatStatPredictionByStat,
    handleAdvancedSearch,
    syncAdvancedFromBasic,
  };

  return { shared, basic, advanced };
}
