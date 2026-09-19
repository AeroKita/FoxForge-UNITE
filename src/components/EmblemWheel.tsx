import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setBonuses } from "../data/gameData";
import { MAX_EMBLEM_SLOTS } from "../engine/emblems";
import type { EmblemSlot } from "../types";
import { asset } from "../ui/asset";
import { emblemIconForGrade } from "../ui/emblemIcon";
import { equippedSetRows, wheelSlotPositions } from "../ui/emblemWheel";
import { EmblemFace } from "./EmblemFace";
import { SetGlyph } from "./SetGlyph";

export function EmblemWheel({
  slots,
  size,
  onSlotClick,
  onEmptyClick,
  hub,
}: {
  slots: (EmblemSlot | null)[];
  size: "lg" | "sm";
  onSlotClick?: (index: number) => void;
  onEmptyClick?: (index: number) => void;
  hub?: ReactNode;
}) {
  const padded = useMemo(() => {
    const next: (EmblemSlot | null)[] = slots.slice(0, MAX_EMBLEM_SLOTS);
    while (next.length < MAX_EMBLEM_SLOTS) next.push(null);
    return next;
  }, [slots]);

  const positions = useMemo(() => wheelSlotPositions(MAX_EMBLEM_SLOTS), []);
  const filledCount = padded.filter(Boolean).length;
  const prevFilled = useRef<boolean[]>(padded.map((s) => s != null));
  const [popping, setPopping] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const nextFlags = padded.map((s) => s != null);
    const fresh = new Set<number>();
    nextFlags.forEach((filled, i) => {
      if (filled && !prevFilled.current[i]) fresh.add(i);
    });
    prevFilled.current = nextFlags;
    if (fresh.size === 0) return;
    setPopping(fresh);
    const timer = window.setTimeout(() => setPopping(new Set()), 180);
    return () => window.clearTimeout(timer);
  }, [padded]);

  const activeGlyphs = useMemo(
    () =>
      equippedSetRows(
        padded.filter((s): s is EmblemSlot => s != null),
        setBonuses,
      )
        .filter((row) => row.active)
        .map((row) => row.color),
    [padded],
  );

  const lg = size === "lg";
  const boxClass = lg ? "w-[min(80vw,280px)]" : "w-32";

  const defaultHub = lg ? (
    <div className="flex flex-col items-center justify-center text-center">
      <span className="text-lg font-bold tabular-nums text-ink">
        {filledCount}/{MAX_EMBLEM_SLOTS}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Emblems</span>
      {activeGlyphs.length > 0 && (
        <span className="mt-1 flex flex-wrap justify-center gap-0.5">
          {activeGlyphs.map((color) => (
            <SetGlyph key={color} color={color} sizeClass="h-3.5 w-3.5" />
          ))}
        </span>
      )}
    </div>
  ) : (
    <span className="text-[10px] font-semibold tabular-nums text-ink">
      {filledCount}/{MAX_EMBLEM_SLOTS}
    </span>
  );

  return (
    <div className={`relative aspect-square ${boxClass}`}>
      <div className="absolute inset-[8%] rounded-full border border-line-soft" aria-hidden />
      <div className="absolute inset-0 flex items-center justify-center">{hub ?? defaultHub}</div>
      {padded.map((slot, i) => {
        const pos = positions[i]!;
        const name = slot?.emblem.pokemonName;
        const label = slot
          ? `Emblem slot ${i + 1}: ${name}, ${slot.grade}`
          : `Empty emblem slot ${i + 1}`;
        const interactive = slot ? onSlotClick : onEmptyClick;
        const inner = slot ? (
          <EmblemFace
            src={asset(emblemIconForGrade(slot.emblem, slot.grade))}
            alt=""
            colors={slot.emblem.colors}
            sizeClass={lg ? "h-11 w-11" : "h-7 w-7"}
            showGlyphs={lg}
          />
        ) : lg ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-line text-xl text-faint">
            +
          </span>
        ) : (
          <span className="block h-7 w-7 rounded-full bg-raise" />
        );
        const className = `absolute -translate-x-1/2 -translate-y-1/2 ${
          popping.has(i) ? "emblem-pop" : ""
        }`;
        const style = { left: `${pos.left}%`, top: `${pos.top}%` };
        if (interactive) {
          return (
            <button
              key={i}
              type="button"
              aria-label={label}
              onClick={() => interactive(i)}
              className={`${className}${lg ? " min-h-11 min-w-11" : ""}`}
              style={style}
            >
              {inner}
            </button>
          );
        }
        return (
          <div key={i} aria-label={label} className={className} style={style}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
