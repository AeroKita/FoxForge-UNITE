import { useEffect, useMemo, useRef, useState } from "react";
import { MAX_EMBLEM_SLOTS } from "../engine/emblems";
import type { EmblemSlot } from "../types";
import { asset } from "../ui/asset";
import { emblemIconForGrade } from "../ui/emblemIcon";
import {
  WHEEL_COIN_SIZE_PCT,
  WHEEL_GEOMETRY,
  wheelSlotPositions,
  wheelTrackGradient,
} from "../ui/emblemWheel";
import { COLOR_SET_GUIDE_TITLE } from "../ui/setProgress";
import { EmblemFace } from "./EmblemFace";

export function EmblemWheel({
  slots,
  onSlotClick,
  onEmptyClick,
  onHubClick,
}: {
  slots: (EmblemSlot | null)[];
  onSlotClick?: (index: number) => void;
  onEmptyClick?: (index: number) => void;
  onHubClick?: () => void;
}) {
  const padded = useMemo(() => {
    const next: (EmblemSlot | null)[] = slots.slice(0, MAX_EMBLEM_SLOTS);
    while (next.length < MAX_EMBLEM_SLOTS) next.push(null);
    return next;
  }, [slots]);

  const positions = useMemo(
    () => wheelSlotPositions(MAX_EMBLEM_SLOTS, WHEEL_GEOMETRY.radiusPct),
    [],
  );
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

  const track = useMemo(() => wheelTrackGradient(padded), [padded]);
  const { box, ringInsetPct, hubInsetPct } = WHEEL_GEOMETRY;

  const hubClass = "absolute rounded-full bg-surface ring-1 ring-line shadow-sm";

  return (
    <div
      className="relative aspect-square mx-auto shrink-0"
      style={{ width: `min(100%, ${box}px)` }}
    >
      <div
        className="absolute rounded-full shadow-inner ring-1 ring-line/60"
        style={{ inset: `${ringInsetPct}%`, background: track }}
        aria-hidden
      />
      {onHubClick ? (
        <button
          type="button"
          aria-label={COLOR_SET_GUIDE_TITLE}
          onClick={onHubClick}
          className={`${hubClass} flex items-center justify-center hover:bg-raise`}
          style={{ inset: `${hubInsetPct}%` }}
        >
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full bg-raise text-lg font-bold text-muted ring-1 ring-line"
            aria-hidden
          >
            ?
          </span>
        </button>
      ) : (
        <div className={hubClass} style={{ inset: `${hubInsetPct}%` }} aria-hidden />
      )}
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
            sizeClass="h-full w-full"
            glyphClass="h-[22%] w-[22%]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-dashed border-muted/40 text-xl text-muted">
            +
          </span>
        );
        const className = `absolute -translate-x-1/2 -translate-y-1/2 ${
          popping.has(i) ? "emblem-pop" : ""
        }${
          slot
            ? " rounded-full drop-shadow-md transition-transform hover:scale-105 active:scale-95"
            : ""
        }`;
        const style = {
          left: `${pos.left}%`,
          top: `${pos.top}%`,
          width: `${WHEEL_COIN_SIZE_PCT}%`,
          height: `${WHEEL_COIN_SIZE_PCT}%`,
        };
        if (interactive) {
          return (
            <button
              key={i}
              type="button"
              aria-label={label}
              onClick={() => interactive(i)}
              className={`${className} flex items-center justify-center`}
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
