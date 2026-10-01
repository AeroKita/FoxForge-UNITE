import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StoreProvider, useStore } from "./state/store";
import { pokemonById } from "./data/gameData";
import { ROLE_COLOR, ROLE_LABEL } from "./ui/theme";
import { asset } from "./ui/asset";
import { firstVisitFadeStyle, firstVisitShellClass } from "./ui/firstVisitFade";
import { usePreloadMoveClips } from "./ui/moveClipPreload";
import { usePreloadPickerIcons } from "./ui/pickerIconPreload";
import { AppBar } from "./components/shell/AppBar";
import { MAIN_TABS, TabBar, tabForMode, type Tab } from "./components/shell/TabBar";
import { BuildScreen } from "./components/screens/BuildScreen";
import { PokemonPickerSheet } from "./components/PokemonPicker";
import { EmblemsScreen } from "./components/screens/EmblemsScreen";
import { ItemsScreen } from "./components/screens/ItemsScreen";
import { SettingsMenu } from "./components/SettingsMenu";

const CompareScreen = lazy(() =>
  import("./components/screens/CompareScreen").then((m) => ({ default: m.CompareScreen })),
);
const OptimizeScreen = lazy(() =>
  import("./components/screens/OptimizeScreen").then((m) => ({ default: m.OptimizeScreen })),
);

const TAB_KEY = "unite-build-optimizer.tab.v1";
const VALID_TABS: Tab[] = ["build", "optimize", "compare", "emblems", "items"];

function usePersistentTab(): [Tab, (t: Tab) => void] {
  const [tab, setTabState] = useState<Tab>(() => {
    try {
      const stored = localStorage.getItem(TAB_KEY);
      if (stored && VALID_TABS.includes(stored as Tab)) return stored as Tab;
    } catch {
      /* quota */
    }
    return "build";
  });

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* quota */
    }
  }, []);

  return [tab, setTab];
}

function Workspace() {
  const { loadout, mode, setMode, expert, pendingOwnedImport } = useStore();
  const [tab, setTab] = usePersistentTab();
  const shownTab = tabForMode(expert, tab);
  const [optimizeVisited, setOptimizeVisited] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pokePickerOpen, setPokePickerOpen] = useState(false);
  const [dataUpdate, setDataUpdate] = useState<string | null>(null);

  useEffect(() => {
    if (shownTab === "optimize") setOptimizeVisited(true);
  }, [shownTab]);

  useEffect(() => {
    if (shownTab !== tab) setTab(shownTab);
  }, [shownTab, tab, setTab]);

  const pendingOwnedOnMount = useRef(pendingOwnedImport);
  useEffect(() => {
    if (pendingOwnedOnMount.current) setTab("emblems");
  }, [setTab]);

  useEffect(() => {
    const onData = (e: Event) => setDataUpdate((e as CustomEvent).detail?.patch ?? null);
    window.addEventListener("unite-data-updated", onData);
    return () => window.removeEventListener("unite-data-updated", onData);
  }, []);

  const p = loadout.pokemonId ? pokemonById.get(loadout.pokemonId) : null;
  const role = p ? ROLE_COLOR[p.role] : null;
  usePreloadMoveClips(p ?? null);
  usePreloadPickerIcons();

  // Freeze the decision on the loadout and tab already restored. Only the
  // empty Build screen fades. A later Pokémon pick must not restart it.
  const [firstVisitClass] = useState(() => firstVisitShellClass(loadout.pokemonId, shownTab));
  const [firstVisitStyle] = useState(() => firstVisitFadeStyle(loadout.pokemonId, shownTab));

  const appBarProps = useMemo(() => {
    // Build and Optimize both pin the selected Pokémon to the top-left of the
    // fixed app bar so it stays visible while scrolling the search controls.
    if (shownTab === "build" || shownTab === "optimize") {
      return {
        leading: (
          <button
            type="button"
            onClick={() => setPokePickerOpen(true)}
            aria-label={p ? "Change Pokémon" : "Select a Pokémon"}
            className="shrink-0 rounded-full"
          >
            {p ? (
              <img
                src={asset(p.iconAsset)}
                alt={p.displayName}
                className="poke-picker-selected h-10 w-10 rounded-full bg-black/10 object-cover"
              />
            ) : (
              <div className="poke-picker-empty h-10 w-10 rounded-full" aria-hidden>
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
            )}
          </button>
        ),
        title: p?.displayName ?? "Select a Pokémon",
        subtitle: p ? (
          <span className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${role!.bg} ${role!.text}`}
            >
              {ROLE_LABEL[p.role]}
            </span>
            <span className="capitalize">{p.attackType}</span>
          </span>
        ) : undefined,
        onTitleTap: () => setPokePickerOpen(true),
      };
    }

    const titles: Record<Exclude<Tab, "build">, string> = {
      optimize: "Optimize",
      compare: "Compare",
      emblems: "Emblems",
      items: "Held Items",
    };

    return {
      leading: undefined,
      title: titles[shownTab as Exclude<Tab, "build">],
      subtitle: undefined,
      onTitleTap: undefined,
    };
  }, [shownTab, p, role]);

  return (
    <div
      className={`min-h-screen bg-bg text-ink${firstVisitClass ? ` ${firstVisitClass}` : ""}`}
      style={firstVisitStyle}
    >
      <AppBar
        {...appBarProps}
        onSettings={() => setSettingsOpen(true)}
        mode={mode}
        onModeChange={setMode}
      />
      <main className="mx-auto w-full max-w-2xl px-3 pb-[calc(64px+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)]">
        {dataUpdate && (
          <div className="mb-2 bg-accent px-4 py-2 text-center text-sm text-white">
            New game data (patch {dataUpdate}) is ready.{" "}
            <button
              type="button"
              onClick={() => location.reload()}
              className="font-semibold underline"
            >
              Reload to apply
            </button>
          </div>
        )}
        {shownTab === "build" && <BuildScreen />}
        {optimizeVisited && (
          <div
            className={shownTab === "optimize" ? undefined : "hidden"}
            aria-hidden={shownTab !== "optimize"}
          >
            <Suspense fallback={null}>
              <OptimizeScreen active={shownTab === "optimize"} onNavigate={setTab} />
            </Suspense>
          </div>
        )}
        {shownTab === "compare" && (
          <Suspense fallback={null}>
            <CompareScreen />
          </Suspense>
        )}
        {shownTab === "emblems" && <EmblemsScreen />}
        {shownTab === "items" && <ItemsScreen />}
      </main>
      <TabBar active={shownTab} onChange={setTab} tabs={MAIN_TABS} advancedVisible={expert} />
      <SettingsMenu open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {pokePickerOpen && <PokemonPickerSheet onClose={() => setPokePickerOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Workspace />
    </StoreProvider>
  );
}
