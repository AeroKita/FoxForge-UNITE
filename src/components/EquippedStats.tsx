import { useState } from "react";
import type { ImpactRow, OocGainRow } from "../ui/emblemWheel";
import {
  EQUIPPED_STATS_VIEW_KEY,
  readEquippedStatsView,
  type EquippedStatsView,
} from "../ui/equippedStatsView";

function StatLine({ label, delta, sign }: { label: string; delta: string; sign: "pos" | "neg" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={`font-mono text-sm font-semibold tabular-nums ${
          sign === "pos" ? "text-pos" : "text-neg"
        }`}
      >
        {delta}
      </dd>
    </div>
  );
}

export function EquippedStats({
  rows,
  flatRows,
  oocGain,
}: {
  rows: ImpactRow[];
  flatRows: ImpactRow[];
  oocGain?: OocGainRow | null;
}) {
  const [view, setView] = useState<EquippedStatsView>(readEquippedStatsView);
  const includeSets = view === "sets";
  const shown = includeSets ? rows : flatRows;
  const showOoc = includeSets ? oocGain : null;
  const empty = shown.length === 0 && !showOoc;

  const select = (next: EquippedStatsView) => {
    setView(next);
    try {
      localStorage.setItem(EQUIPPED_STATS_VIEW_KEY, next);
    } catch {
      /* quota */
    }
  };

  const emptyCopy = includeSets
    ? "Equip emblems to see their effect on this Pokémon."
    : "No emblems equipped.";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-faint">Equipped Stats</h4>
        <div
          role="tablist"
          aria-label="Equipped stats view"
          className="flex rounded-lg bg-raise p-0.5 ring-1 ring-line"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!includeSets}
            onClick={() => select("flats")}
            className={`min-h-11 rounded-md px-2.5 text-[11px] font-semibold ${
              !includeSets ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            Flats
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={includeSets}
            onClick={() => select("sets")}
            className={`min-h-11 rounded-md px-2.5 text-[11px] font-semibold ${
              includeSets ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            With sets
          </button>
        </div>
      </div>
      {empty ? (
        <p className="text-sm text-faint">{emptyCopy}</p>
      ) : (
        <dl className="flex flex-col gap-1">
          {shown.map((row) => (
            <StatLine key={row.key} label={row.label} delta={row.delta} sign={row.sign} />
          ))}
          {showOoc && <StatLine label={showOoc.label} delta={showOoc.delta} sign={showOoc.sign} />}
        </dl>
      )}
    </div>
  );
}
