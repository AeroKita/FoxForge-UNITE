import { emblemById, setBonuses } from "../data/gameData";
import { sumEmblemFlats } from "../engine/emblems";
import { emblemFlatRows, equippedSetRows, slotsFromPicks } from "../ui/emblemWheel";
import { formatSetBonus } from "../ui/setProgress";
import type { EmblemGrade } from "../types";
import { SetGlyph } from "./SetGlyph";

/**
 * The net flat stats a 10-emblem set provides in isolation (rounded as in-game),
 * plus per-color counts and the active set-bonus %. Mirrors UNITE-DB's
 * "Equipped Stats" + "Equipped Sets" panels.
 */
export function EmblemSetSummary({
  picks,
  precise = false,
}: {
  picks: { emblemId: string; grade: EmblemGrade }[];
  precise?: boolean;
}) {
  const slots = slotsFromPicks(picks, (id) => emblemById.get(id));
  if (slots.length === 0) return null;

  const flatRows = emblemFlatRows(sumEmblemFlats(slots), precise);
  const setRows = equippedSetRows(slots, setBonuses);

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-surface/60 p-3 ring-1 ring-line">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
          Emblem Stats
        </p>
        <div className="flex flex-col gap-0.5">
          {flatRows.length === 0 ? (
            <span className="text-xs text-faint">No flat stats</span>
          ) : (
            flatRows.map((row) => (
              <div key={row.key} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-muted">{row.label}</span>
                <span
                  className={`font-mono font-semibold ${row.sign === "pos" ? "text-pos" : "text-neg"}`}
                >
                  {row.delta}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
          Color Sets
        </p>
        <div className="flex flex-col gap-0.5">
          {setRows.map((row) => (
            <div key={row.color} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5">
                <SetGlyph color={row.color} sizeClass="h-3.5 w-3.5 shrink-0" />
                <span className="capitalize text-muted">{row.color}</span>
                <span className="text-faint">×{row.count}</span>
              </span>
              <span
                className={`font-mono ${row.bonusPercent != null ? "font-semibold text-ink" : "text-faint"}`}
              >
                {row.bonusPercent != null ? formatSetBonus(row.color, row.bonusPercent) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
