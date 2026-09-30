import { ALL_EMBLEM_COLORS, EMBLEM_COLOR_HEX, readableTextColor } from "../ui/colors";
import {
  EMBLEM_STAT_FILTERS,
  inventoryFiltersActive,
  nextSignSelection,
  nextStatSelection,
  type EmblemInventoryFilters,
  type EmblemStatSign,
} from "../ui/emblemInventoryFilter";
import type { EmblemColor, StatBlock } from "../types";
import { SetGlyph } from "./SetGlyph";

export interface EmblemFilterBarProps {
  color: EmblemInventoryFilters["color"];
  onColor: (color: EmblemColor | "all") => void;
  stat: keyof StatBlock | null;
  onStat: (stat: keyof StatBlock | null) => void;
  sign: EmblemStatSign | null;
  onSign: (sign: EmblemStatSign | null) => void;
  onClear: () => void;
}

/**
 * Color row plus a stat-sign toggle and stat pills. Each row scrolls on its
 * own so the two filters stay separate instead of wrapping into one pile.
 */
export function EmblemFilterBar({
  color,
  onColor,
  stat,
  onStat,
  sign,
  onSign,
  onClear,
}: EmblemFilterBarProps) {
  const canClear = inventoryFiltersActive({ query: "", color, stat, sign });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold tracking-wide text-faint uppercase">Color</p>
          {canClear && (
            <button
              type="button"
              onClick={onClear}
              className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-semibold text-accent hover:bg-accent-weak"
            >
              Clear filters
            </button>
          )}
        </div>
        <div
          role="group"
          aria-label="Color"
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5"
        >
          <FilterChip label="All" active={color === "all"} onClick={() => onColor("all")} />
          {ALL_EMBLEM_COLORS.map((c) => (
            <FilterChip
              key={c}
              label={c}
              glyph={c}
              active={color === c}
              activeColor={EMBLEM_COLOR_HEX[c]}
              onClick={() => onColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold tracking-wide text-faint uppercase">Stats</p>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Stat sign"
            className="flex shrink-0 gap-0.5 rounded-lg bg-raise p-0.5"
          >
            <SignButton
              label="Positive"
              glyph="+"
              pressed={sign === "pos"}
              tone="pos"
              onClick={() => onSign(nextSignSelection(sign, "pos"))}
            />
            <SignButton
              label="Negative"
              glyph={"\u2212"}
              pressed={sign === "neg"}
              tone="neg"
              onClick={() => onSign(nextSignSelection(sign, "neg"))}
            />
          </div>
          <div
            role="group"
            aria-label="Stat"
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5"
          >
            {EMBLEM_STAT_FILTERS.map((row) => (
              <FilterChip
                key={row.key}
                label={row.label}
                active={stat === row.key}
                onClick={() => onStat(nextStatSelection(stat, row.key))}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SignButton({
  label,
  glyph,
  pressed,
  tone,
  onClick,
}: {
  label: string;
  glyph: string;
  pressed: boolean;
  tone: EmblemStatSign;
  onClick: () => void;
}) {
  const toneClass = pressed
    ? tone === "pos"
      ? "bg-pos/15 text-pos"
      : "bg-neg/15 text-neg"
    : "text-muted hover:text-ink";
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      className={`min-h-11 min-w-11 rounded-md px-2.5 text-base font-semibold ${toneClass}`}
    >
      {glyph}
    </button>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  activeColor,
  glyph,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeColor?: string;
  glyph?: EmblemColor;
}) {
  const style =
    active && activeColor
      ? { background: activeColor, color: readableTextColor(activeColor) }
      : undefined;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      style={style}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium whitespace-nowrap capitalize ${
        active
          ? activeColor
            ? "border-line"
            : "border-transparent bg-accent text-white"
          : "border-transparent bg-raise text-muted hover:text-ink"
      }`}
    >
      {glyph && <SetGlyph color={glyph} sizeClass="h-4 w-4" />}
      {label}
    </button>
  );
}
