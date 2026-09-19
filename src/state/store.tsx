// App state: the in-progress loadout (reducer) + saved loadouts (localStorage).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type { EmblemGrade } from "../types";
import {
  type Loadout,
  type SavedLoadout,
  type EmblemPick,
  emptyLoadout,
  loadSavedLoadouts,
  saveLoadout as persistSave,
  deleteLoadout as persistDelete,
  toLoadout,
  saveCurrent,
  loadCurrent,
  loadOwnedEmblems,
  saveOwnedEmblems,
  ownedKey,
  normalizeLoadout,
  MAX_EMBLEMS,
} from "./loadout";
import {
  buildShareUrl,
  encodeEmblemsLink,
  encodeLoadoutLink,
  encodeOwnedLink,
  readShareHash,
  type ShareResolver,
} from "./shareLink";
import { emblemIdByDex } from "../data/gameData";
import {
  clampHeldGrade,
  gradeForHeldItem,
  loadHeldItemGradeMemory,
  resolveSlotGrades,
  saveHeldItemGradeMemory,
} from "./heldItemGrades";
import { requestPersistentStorage } from "./persistentStorage";

export type Action =
  | { type: "setPokemon"; pokemonId: string }
  | { type: "setLevel"; level: number }
  | { type: "setHeldItem"; slot: number; id: string | null }
  | { type: "setBattleItem"; id: string | null }
  | { type: "addEmblem"; emblemId: string; grade: EmblemGrade }
  | { type: "removeEmblem"; index: number }
  | { type: "setEmblemGrade"; index: number; grade: EmblemGrade }
  | { type: "toggleBoost"; id: string }
  | { type: "setMove"; slot: "move1" | "move2"; moveId: string }
  // applyBuild is a partial merge: only the fields that are provided overwrite
  // the loadout. This lets the optimizer apply emblems-only or held-items-only
  // without clobbering the other, and makes repeated applies composable.
  | {
      type: "applyBuild";
      heldItemIds?: (string | null)[];
      battleItemId?: string | null;
      emblems?: EmblemPick[];
      level?: number;
      move1Id?: string | null;
      move2Id?: string | null;
    }
  | { type: "load"; loadout: Loadout }
  | { type: "reset" };

export function reducer(state: Loadout, action: Action): Loadout {
  switch (action.type) {
    case "setPokemon":
      // Switching Pokémon invalidates move-based active boosts and move picks
      // (null → the Moves UI derives the new Pokémon's default final moves).
      return {
        ...state,
        pokemonId: action.pokemonId,
        move1Id: null,
        move2Id: null,
        activeBoostIds: state.activeBoostIds.filter((b) => !b.startsWith("move:")),
      };
    case "setLevel":
      return { ...state, level: Math.max(1, Math.min(15, action.level)) };
    case "setHeldItem": {
      // Prevent the same held item in two slots.
      const heldItemIds = state.heldItemIds.map((cur, i) =>
        i === action.slot ? action.id : cur === action.id ? null : cur,
      );
      return { ...state, heldItemIds };
    }
    case "setBattleItem":
      return {
        ...state,
        battleItemId: action.id,
        activeBoostIds: state.activeBoostIds.filter((b) => b !== "x-attack"),
      };
    case "addEmblem": {
      if (state.emblems.length >= MAX_EMBLEMS) return state;
      return {
        ...state,
        emblems: [...state.emblems, { emblemId: action.emblemId, grade: action.grade }],
      };
    }
    case "removeEmblem":
      return { ...state, emblems: state.emblems.filter((_, i) => i !== action.index) };
    case "setEmblemGrade":
      return {
        ...state,
        emblems: state.emblems.map((e, i) =>
          i === action.index ? { ...e, grade: action.grade } : e,
        ),
      };
    case "toggleBoost": {
      const on = state.activeBoostIds.includes(action.id);
      return {
        ...state,
        activeBoostIds: on
          ? state.activeBoostIds.filter((b) => b !== action.id)
          : [...state.activeBoostIds, action.id],
      };
    }
    case "setMove":
      return action.slot === "move1"
        ? { ...state, move1Id: action.moveId }
        : { ...state, move2Id: action.moveId };
    case "applyBuild":
      return normalizeLoadout({
        ...state,
        level: action.level !== undefined ? Math.max(1, Math.min(15, action.level)) : state.level,
        heldItemIds:
          action.heldItemIds !== undefined
            ? [
                action.heldItemIds[0] ?? null,
                action.heldItemIds[1] ?? null,
                action.heldItemIds[2] ?? null,
              ]
            : state.heldItemIds,
        battleItemId: action.battleItemId !== undefined ? action.battleItemId : state.battleItemId,
        move1Id: action.move1Id !== undefined ? action.move1Id : state.move1Id,
        move2Id: action.move2Id !== undefined ? action.move2Id : state.move2Id,
        emblems:
          action.emblems !== undefined ? action.emblems.slice(0, MAX_EMBLEMS) : state.emblems,
      });
    case "load":
      return normalizeLoadout(action.loadout);
    case "reset":
      return emptyLoadout(state.pokemonId);
    default:
      return state;
  }
}

export type ViewMode = "beginner" | "expert";
const MODE_KEY = "unite-build-optimizer.mode.v1";
function loadMode(): ViewMode {
  try {
    return localStorage.getItem(MODE_KEY) === "expert" ? "expert" : "beginner";
  } catch {
    return "beginner";
  }
}

export type Theme = "light" | "dark";
export type ThemePref = "system" | "light" | "dark";
const THEME_KEY = "unite-build-optimizer.theme.v1";

function loadThemePref(): ThemePref {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

const prefersLight = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches;

/** Resolve a preference to an applied theme. System → OS, defaulting to dark. */
function resolveTheme(pref: ThemePref): Theme {
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  return prefersLight() ? "light" : "dark"; // system: dark unless OS explicitly prefers light
}

interface Store {
  loadout: Loadout;
  dispatch: React.Dispatch<Action>;
  saved: SavedLoadout[];
  save: (name: string, id?: string) => SavedLoadout | null;
  remove: (id: string) => void;
  loadSaved: (saved: SavedLoadout) => void;
  saveError: string | null;
  owned: Set<string>; // keys are `${emblemId}:${grade}`
  toggleOwned: (emblemId: string, grade: EmblemGrade) => void;
  bulkSetOwned: (emblemIds: string[], grade: EmblemGrade, own: boolean) => void;
  /** Replace the entire owned-emblem set (used by inventory import). */
  replaceOwned: (keys: Set<string>) => void;
  shareUrl: () => string;
  emblemShareUrl: () => string;
  ownedShareUrl: () => string;
  pendingOwnedImport: Set<string> | null;
  applyPendingOwnedImport: (mode: "replace" | "merge") => void;
  dismissPendingOwnedImport: () => void;
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
  expert: boolean; // convenience: mode === "expert"
  theme: Theme; // resolved, for any theme-conditional rendering
  themePref: ThemePref;
  setThemePref: (p: ThemePref) => void;
  /** Global per-item held grade (default 40). Synced with Builder sliders. */
  heldItemGrade: (itemId: string) => number;
  setHeldItemGradeById: (itemId: string, grade: number) => void;
  heldSlotGrades: [number, number, number];
  setHeldItemGradeForSlot: (slot: number, grade: number) => void;
  /**
   * IDs of held items whose grade has been explicitly set by the user.
   * These represent the user's "owned" held items (they've interacted with the
   * grade slider for these items on the Held Items page).
   * Empty = user hasn't set any grades yet (fall back to all items).
   */
  ownedHeldItemIds: string[];
}

const shareResolver: ShareResolver = {
  emblemIdForDex: (dex) => emblemIdByDex.get(dex) ?? null,
  dexForEmblemId: (id) => Number(/^(\d+)/.exec(id)?.[1] ?? 0),
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [initialShare] = useState(() =>
    typeof location !== "undefined" ? readShareHash(location.hash, shareResolver) : null,
  );
  const [loadout, dispatch] = useReducer(reducer, initialShare, (share) => {
    if (share?.kind === "loadout") return normalizeLoadout(share.loadout);
    if (share?.kind === "emblems") {
      const current = loadCurrent() ?? emptyLoadout();
      return normalizeLoadout({ ...current, emblems: share.picks });
    }
    const current = loadCurrent();
    if (current) return current;
    return emptyLoadout();
  });
  const [saved, setSaved] = useState<SavedLoadout[]>(() => loadSavedLoadouts());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [owned, setOwned] = useState<Set<string>>(() => loadOwnedEmblems());
  const [pendingOwnedImport, setPendingOwnedImport] = useState<Set<string> | null>(() =>
    initialShare?.kind === "owned" ? initialShare.owned : null,
  );
  const [heldGradeMemory, setHeldGradeMemory] = useState<Record<string, number>>(() =>
    loadHeldItemGradeMemory(),
  );
  const [mode, setModeState] = useState<ViewMode>(() => loadMode());
  const [themePref, setThemePrefState] = useState<ThemePref>(() => loadThemePref());
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme(loadThemePref()));

  const heldSlotGrades = useMemo(
    () => resolveSlotGrades(loadout, heldGradeMemory),
    [loadout, heldGradeMemory],
  );

  const setHeldItemGradeById = useCallback((itemId: string, grade: number) => {
    const g = clampHeldGrade(grade);
    setHeldGradeMemory((prev) => {
      const next = { ...prev, [itemId]: g };
      saveHeldItemGradeMemory(next);
      return next;
    });
  }, []);

  // Set the grade for whatever item occupies a Builder slot (no-op for an empty slot).
  const setHeldItemGradeForSlot = useCallback(
    (slot: number, grade: number) => {
      const id = loadout.heldItemIds[slot];
      if (id) setHeldItemGradeById(id, grade);
    },
    [loadout.heldItemIds, setHeldItemGradeById],
  );

  // Persist the in-progress build across reloads.
  useEffect(() => {
    saveCurrent(loadout);
  }, [loadout]);

  // Drop a consumed share hash so a reload keeps the Trainer's own edits.
  useEffect(() => {
    if (!initialShare) return;
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }, [initialShare]);

  // Best-effort: ask the browser to keep this origin. Trainer keys still live
  // in localStorage either way; this only reduces eviction pressure.
  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  // Apply the resolved theme to <html data-theme>; CSS variables cascade from there.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#110d1f" : "#ffffff");
  }, [theme]);

  // While following the system, react to OS light/dark changes live.
  useEffect(() => {
    if (themePref !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setThemeState(resolveTheme("system"));
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [themePref]);

  const store = useMemo<Store>(
    () => ({
      loadout,
      dispatch,
      saved,
      saveError,
      owned,
      save: (name, id) => {
        try {
          const next = persistSave(saved, loadout, name, id);
          setSaved(next);
          setSaveError(null);
          return next.find((l) => l.id === id) ?? next[next.length - 1] ?? null;
        } catch (e) {
          setSaveError(e instanceof Error ? e.message : String(e));
          return null;
        }
      },
      remove: (id) => setSaved(persistDelete(saved, id)),
      loadSaved: (s) => dispatch({ type: "load", loadout: toLoadout(s) }),
      toggleOwned: (emblemId, grade) =>
        setOwned((prev) => {
          const next = new Set(prev);
          const key = ownedKey(emblemId, grade);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          saveOwnedEmblems(next);
          return next;
        }),
      bulkSetOwned: (emblemIds, grade, own) =>
        setOwned((prev) => {
          const next = new Set(prev);
          for (const id of emblemIds) {
            const key = ownedKey(id, grade);
            if (own) next.add(key);
            else next.delete(key);
          }
          saveOwnedEmblems(next);
          return next;
        }),
      replaceOwned: (keys) =>
        setOwned(() => {
          const next = new Set(keys);
          saveOwnedEmblems(next);
          return next;
        }),
      shareUrl: () => buildShareUrl(encodeLoadoutLink(loadout)),
      emblemShareUrl: () => buildShareUrl(encodeEmblemsLink(loadout.emblems)),
      ownedShareUrl: () => buildShareUrl(encodeOwnedLink(owned, shareResolver)),
      pendingOwnedImport,
      applyPendingOwnedImport: (mode) => {
        if (!pendingOwnedImport) return;
        if (mode === "replace") {
          setOwned(() => {
            const next = new Set(pendingOwnedImport);
            saveOwnedEmblems(next);
            return next;
          });
        } else {
          setOwned((prev) => {
            const next = new Set(prev);
            for (const key of pendingOwnedImport) next.add(key);
            saveOwnedEmblems(next);
            return next;
          });
        }
        setPendingOwnedImport(null);
      },
      dismissPendingOwnedImport: () => setPendingOwnedImport(null),
      mode,
      expert: mode === "expert",
      setMode: (m) => {
        setModeState(m);
        try {
          localStorage.setItem(MODE_KEY, m);
        } catch {
          /* quota */
        }
      },
      theme,
      themePref,
      setThemePref: (p) => {
        setThemePrefState(p);
        setThemeState(resolveTheme(p));
        try {
          if (p === "system") localStorage.removeItem(THEME_KEY);
          else localStorage.setItem(THEME_KEY, p);
        } catch {
          /* quota */
        }
      },
      heldItemGrade: (itemId) => gradeForHeldItem(heldGradeMemory, itemId),
      setHeldItemGradeById,
      heldSlotGrades,
      setHeldItemGradeForSlot,
      ownedHeldItemIds: Object.keys(heldGradeMemory),
    }),
    [
      loadout,
      saved,
      saveError,
      owned,
      pendingOwnedImport,
      mode,
      theme,
      themePref,
      heldGradeMemory,
      heldSlotGrades,
      setHeldItemGradeById,
      setHeldItemGradeForSlot,
    ],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
