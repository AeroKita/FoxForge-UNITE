import { EMBLEM_COLOR_HEX, readableTextColor } from "../ui/colors";
import { equippedSetCaption, type EquippedSetRow } from "../ui/emblemWheel";
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
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => {
            const caption = equippedSetCaption(row);
            const label = `${row.color}, ${row.count} equipped${row.active ? `, ${caption}` : ""}`;
            const needsContrastRing = row.color === "white" || row.color === "yellow";
            const body = (
              <>
                <SetGlyph color={row.color} sizeClass="h-7 w-7 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="text-sm capitalize text-ink">
                    {row.color}
                    <span className="ml-1.5 font-mono text-xs tabular-nums text-muted">
                      {row.count}
                    </span>
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="flex gap-1">
                      {row.tiers.map((t) => {
                        const reached = t.reached;
                        const fill = EMBLEM_COLOR_HEX[row.color];
                        return (
                          <span
                            key={t.count}
                            className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-xs font-bold tabular-nums transition-colors ${
                              reached
                                ? needsContrastRing
                                  ? "ring-1 ring-white/50"
                                  : ""
                                : "bg-raise text-faint ring-1 ring-inset ring-line"
                            }`}
                            style={
                              reached
                                ? { background: fill, color: readableTextColor(fill) }
                                : undefined
                            }
                          >
                            {t.count}
                          </span>
                        );
                      })}
                    </span>
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        row.active ? "text-ink" : "text-faint"
                      }`}
                    >
                      {caption}
                    </span>
                  </span>
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
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-1 text-left hover:bg-raise"
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
                className="flex min-h-11 items-center gap-3 px-1"
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
