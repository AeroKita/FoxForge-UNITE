import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../state/store";
import { deriveBuild } from "../engine/derive";
import { formatStat, formatExactDelta } from "../ui/format";
import { offenseFor } from "../ui/offense";
import { dockFlashDeltas, retainFlashBaseline } from "../ui/statFlashes";
import { ROLE_BAND } from "../ui/theme";
import { BottomSheet } from "./shell/BottomSheet";
import { EffectiveStatsGrid } from "./EffectiveStatsGrid";

const TRACKED = ["hp", "offense", "moveSpeed", "critRate"] as const;
type TrackedKey = (typeof TRACKED)[number];

/** Fixed strip above the tab bar: HP, offense, move speed, crit rate + delta flashes. */
export function StatDock() {
  const { loadout, heldSlotGrades } = useStore();
  const [open, setOpen] = useState(false);
  const [flashes, setFlashes] = useState<Partial<Record<TrackedKey, number>>>({});
  const prevRef = useRef<{ pokemonId: string; values: Record<TrackedKey, number> } | null>(null);
  const flashBaselineRef = useRef<Record<TrackedKey, number> | null>(null);
  const pokemonChangedAt = useRef(0);

  const derived = useMemo(
    () => deriveBuild(loadout, true, heldSlotGrades),
    [loadout, heldSlotGrades],
  );
  const { pokemon, effective } = derived;

  const offense = useMemo(
    () => (pokemon && effective ? offenseFor(pokemon.attackType, effective) : null),
    [pokemon, effective],
  );

  useEffect(() => {
    if (!pokemon || !effective || !offense) {
      prevRef.current = null;
      flashBaselineRef.current = null;
      return;
    }
    const values: Record<TrackedKey, number> = {
      hp: effective.hp,
      offense: offense.value,
      moveSpeed: effective.moveSpeed,
      critRate: effective.critRate,
    };
    const prev = prevRef.current;
    prevRef.current = { pokemonId: pokemon.id, values };
    if (!prev || prev.pokemonId !== pokemon.id) {
      pokemonChangedAt.current = Date.now();
      flashBaselineRef.current = null;
      return;
    }
    if (Date.now() - pokemonChangedAt.current < 800) return;
    if (Object.keys(dockFlashDeltas(values, prev.values, TRACKED)).length === 0) return;
    const baseline = retainFlashBaseline(flashBaselineRef.current, prev.values);
    flashBaselineRef.current = baseline;
    setFlashes(dockFlashDeltas(values, baseline, TRACKED));
    const t = setTimeout(() => {
      setFlashes({});
      flashBaselineRef.current = null;
    }, 1500);
    return () => clearTimeout(t);
  }, [pokemon, effective, offense]);

  if (!pokemon || !effective || !offense) return null;

  const cells: { key: TrackedKey; value: string; label: string; kind: "int" | "percent" }[] = [
    { key: "hp", value: formatStat(effective.hp, "int"), label: "HP", kind: "int" },
    {
      key: "offense",
      value: formatStat(offense.value, "int"),
      label: offense.label,
      kind: "int",
    },
    {
      key: "moveSpeed",
      value: formatStat(effective.moveSpeed, "int"),
      label: "Move Speed",
      kind: "int",
    },
    {
      key: "critRate",
      value: formatStat(effective.critRate, "percent"),
      label: "Crit Rate",
      kind: "percent",
    },
  ];

  return (
    <>
      <div
        className="fixed inset-x-0 z-20"
        style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-2xl px-3 pb-1">
          <button
            type="button"
            aria-label="Open full stats"
            onClick={() => setOpen(true)}
            className={`relative w-full overflow-hidden rounded-xl bg-surface shadow-md ring-1 ${ROLE_BAND[pokemon.role].ring}`}
          >
            <span aria-hidden className={`absolute inset-0 ${ROLE_BAND[pokemon.role].band}`} />
            <div className="relative grid grid-cols-4">
              {cells.map((cell) => (
                <div key={cell.key} className="flex flex-col items-center px-1 py-2">
                  <span className="flex items-baseline gap-0.5">
                    <span className="font-mono text-sm font-semibold text-ink">{cell.value}</span>
                    {flashes[cell.key] != null && Math.abs(flashes[cell.key]!) > 1e-9 && (
                      <span
                        className={`text-[11px] ${flashes[cell.key]! >= 0 ? "text-pos" : "text-neg"}`}
                      >
                        {formatExactDelta(flashes[cell.key]!, cell.kind)}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-faint">{cell.label}</span>
                </div>
              ))}
            </div>
          </button>
        </div>
      </div>
      {open && (
        <BottomSheet
          title={`${pokemon.displayName} — Lv ${loadout.level}`}
          onClose={() => setOpen(false)}
        >
          <EffectiveStatsGrid derived={derived} />
        </BottomSheet>
      )}
    </>
  );
}
