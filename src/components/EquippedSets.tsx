import { EMBLEM_COLOR_HEX, readableTextColor } from "../ui/colors";
import { formatSetTier } from "../ui/emblemSets";
import type { EquippedSetRow } from "../ui/emblemWheel";
import type { EmblemColor } from "../types";
import { SetGlyph } from "./SetGlyph";

export function EquippedSets({
  rows,
  onRowClick,
}: {
  rows: EquippedSetRow[];
  onRowClick?: (color: EmblemColor) => void;
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
        Equipped Sets
      </h4>
      {rows.length === 0 ? (
        <p className="text-sm text-faint">No emblems equipped.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => {
            const effect = row.active
              ? formatSetTier(row.info, row.active)
              : row.next != null
                ? `${row.count}/${row.next}`
                : `×${row.count}`;
            const label = `${row.color}, ${row.count} equipped${row.active ? `, ${effect}` : ""}`;
            const body = (
              <>
                <SetGlyph color={row.color} sizeClass="h-6 w-6" />
                <span className="min-w-0 flex-1 capitalize text-sm text-ink">{row.color}</span>
                <span className="rounded bg-raise px-1.5 font-mono text-xs text-ink">
                  {row.count}
                </span>
                <span className="flex gap-0.5">
                  {row.tiers.map((t) => {
                    const reached = t.reached;
                    const fill = EMBLEM_COLOR_HEX[row.color];
                    return (
                      <span
                        key={t.count}
                        className={`min-w-6 rounded px-1 text-center font-mono text-[10px] transition-colors ${
                          reached ? "" : "bg-raise text-faint"
                        }`}
                        style={
                          reached ? { background: fill, color: readableTextColor(fill) } : undefined
                        }
                      >
                        {t.count}
                      </span>
                    );
                  })}
                </span>
                <span className="w-28 text-right text-[11px] leading-tight text-muted">
                  {effect}
                </span>
              </>
            );
            if (onRowClick) {
              return (
                <li key={row.color}>
                  <button
                    type="button"
                    aria-label={label}
                    onClick={() => onRowClick(row.color)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-lg px-1 text-left hover:bg-raise"
                  >
                    {body}
                  </button>
                </li>
              );
            }
            return (
              <li
                key={row.color}
                aria-label={label}
                className="flex min-h-11 items-center gap-2 px-1"
              >
                {body}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
