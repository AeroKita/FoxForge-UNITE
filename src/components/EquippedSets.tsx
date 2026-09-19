import { useEffect, useState } from "react";
import { EMBLEM_SET_UI_HEX, readableTextColor } from "../ui/colors";
import {
  equippedSetCaption,
  equippedSetDetail,
  equippedSetFillPercent,
  type EquippedSetRow,
} from "../ui/emblemWheel";
import type { EmblemColor } from "../types";
import { SetGlyph } from "./SetGlyph";

function TierPip({
  label,
  reached,
  active,
  fill,
}: {
  label: number;
  reached: boolean;
  active: boolean;
  fill: string;
}) {
  const ink = reached ? readableTextColor(fill) : undefined;
  return (
    <span
      className={[
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
        reached ? "ring-2 ring-white/90" : "bg-surface/85 text-faint ring-1 ring-line",
        active ? "ring-[3px] ring-white" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={reached ? { background: fill, color: ink } : undefined}
    >
      {label}
    </span>
  );
}

export function EquippedSets({ rows }: { rows: EquippedSetRow[] }) {
  const [openColor, setOpenColor] = useState<EmblemColor | null>(null);

  useEffect(() => {
    if (openColor && !rows.some((r) => r.color === openColor)) setOpenColor(null);
  }, [openColor, rows]);

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
            const detail = equippedSetDetail(row);
            const open = openColor === row.color;
            const label = `${row.color}, ${row.count} equipped, ${detail}`;
            const fill = EMBLEM_SET_UI_HEX[row.color];
            const maxTier = row.tiers.at(-1)?.count ?? 0;
            const fillPct = equippedSetFillPercent(row.count, maxTier);
            const countOnFill = fillPct >= 30;
            const countInk = countOnFill ? readableTextColor(fill) : undefined;
            const detailId = `equipped-set-detail-${row.color}`;
            return (
              <li key={row.color}>
                <button
                  type="button"
                  aria-label={label}
                  aria-expanded={open}
                  aria-controls={detailId}
                  title={caption}
                  onClick={() => setOpenColor((c) => (c === row.color ? null : row.color))}
                  className="relative w-full overflow-hidden rounded-full bg-raise text-left ring-1 ring-line hover:ring-accent/50"
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-full motion-safe:transition-[width] motion-safe:duration-1000 motion-safe:ease-out"
                    style={{ width: `${fillPct}%`, background: fill }}
                    aria-hidden
                  />
                  <span className="relative z-10 flex min-h-11 items-center gap-1.5 pl-0.5 pr-2">
                    <span className="flex w-11 shrink-0 items-center justify-center">
                      <SetGlyph color={row.color} sizeClass="h-9 w-9" />
                    </span>
                    <span
                      className={`w-5 shrink-0 text-sm font-bold tabular-nums ${countInk ? "" : "text-ink"}`}
                      style={countInk ? { color: countInk } : undefined}
                    >
                      {row.count}
                    </span>
                    <span className="ml-auto flex items-center gap-1.5">
                      {row.tiers.map((t) => (
                        <TierPip
                          key={t.count}
                          label={t.count}
                          reached={t.reached}
                          active={row.active?.count === t.count}
                          fill={fill}
                        />
                      ))}
                    </span>
                  </span>
                </button>
                {open && (
                  <div
                    id={detailId}
                    role="region"
                    aria-label={`${row.color} set bonus`}
                    className="mt-1 flex items-center gap-2.5 rounded-xl bg-raise px-3 py-2 ring-1 ring-line"
                  >
                    <span
                      className="h-8 w-1.5 shrink-0 rounded-full"
                      style={{ background: fill }}
                      aria-hidden
                    />
                    <SetGlyph color={row.color} sizeClass="h-7 w-7 shrink-0" />
                    <p className="min-w-0 text-sm font-semibold text-ink">{detail}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
