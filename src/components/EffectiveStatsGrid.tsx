import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { DerivedBuild } from "../engine/derive";
import { useStore } from "../state/store";
import { STAT_ROWS, formatExactDelta, formatMoveSpeed, formatStat } from "../ui/format";
import { clampTooltipCenter, moveSpeedSofteningCopy, tooltipOpensAbove } from "../ui/moveSpeedTip";

const TIP_WIDTH_CAP = 256;
const TIP_HEIGHT = 96;
const TIP_MARGIN = 12;

function SofteningMark({ copy }: { copy: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: TIP_WIDTH_CAP, above: true });
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  const place = useCallback((anchor: DOMRect) => {
    const viewportWidth = window.innerWidth;
    const width = Math.max(0, Math.min(TIP_WIDTH_CAP, viewportWidth - TIP_MARGIN * 2));
    const above = tooltipOpensAbove(anchor.top, TIP_HEIGHT, TIP_MARGIN);
    setPos({
      width,
      above,
      left: clampTooltipCenter(anchor.left + anchor.width / 2, viewportWidth, width, TIP_MARGIN),
      top: above ? anchor.top : anchor.bottom,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event.target instanceof Node && wrapRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const reposition = () => {
      const button = wrapRef.current?.querySelector("button");
      if (button) place(button.getBoundingClientRect());
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, place]);

  return (
    <span ref={wrapRef} className="inline-flex align-middle">
      <button
        type="button"
        aria-expanded={open}
        aria-label={copy}
        aria-describedby={open ? tipId : undefined}
        className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-sans text-[11px] font-bold leading-none text-muted ring-1 ring-line focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        onClick={(event) => {
          event.stopPropagation();
          place(event.currentTarget.getBoundingClientRect());
          setOpen((current) => !current);
        }}
      >
        ?
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            transform: pos.above ? "translate(-50%, calc(-100% - 8px))" : "translate(-50%, 8px)",
            background: "var(--color-tip-bg)",
            color: "var(--color-tip-ink)",
          }}
          className="z-[60] rounded-lg px-2.5 py-1.5 text-left font-sans text-xs leading-snug font-normal shadow-xl ring-1 ring-black/10"
        >
          {copy}
        </span>
      )}
    </span>
  );
}

/** Shown on a speed figure the in-match curve changed. */
export function MoveSpeedSofteningMark({ speed }: { speed: number }) {
  const { expert } = useStore();
  const copy = moveSpeedSofteningCopy(speed, expert);
  if (!copy) return null;
  return <SofteningMark copy={copy} />;
}

function SpeedFace({
  qualifier,
  value,
  delta,
  buffed,
}: {
  qualifier: string;
  value: number;
  delta: number;
  buffed: boolean;
}) {
  return (
    <div
      className={`col-span-full flex flex-col gap-0.5 border-b py-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 ${buffed ? "border-as-border" : "border-line-soft"}`}
    >
      <dt className="text-sm leading-snug text-muted">
        Speed {qualifier}
        {buffed && (
          <span className="ml-1 align-middle text-[9px] font-bold uppercase text-as-ink">buff</span>
        )}
      </dt>
      <dd
        className={`min-w-0 text-right font-mono text-sm leading-snug font-semibold ${buffed ? "text-as-ink" : "text-ink"}`}
      >
        {formatMoveSpeed(value)}
        {Math.abs(delta) > 1e-9 && (
          <span className={`ml-1 text-xs font-normal ${delta >= 0 ? "text-pos" : "text-neg"}`}>
            ({formatExactDelta(delta, "int")})
          </span>
        )}
        <MoveSpeedSofteningMark speed={value} />
      </dd>
    </div>
  );
}

/** Full-width rows: in combat, then out of combat. */
export function SplitSpeedCells({
  inCombat,
  noCombat,
  inDelta,
  noDelta,
  inBuffed,
}: {
  inCombat: number;
  noCombat: number;
  inDelta: number;
  noDelta: number;
  inBuffed: boolean;
}) {
  return (
    <>
      <SpeedFace qualifier="in combat" value={inCombat} delta={inDelta} buffed={inBuffed} />
      <SpeedFace qualifier="out of combat" value={noCombat} delta={noDelta} buffed={false} />
    </>
  );
}

/** Shared 10-stat grid. When in-combat and out-of-combat speed differ, each gets a full-width row. */
export function EffectiveStatsGrid({ derived }: { derived: DerivedBuild }) {
  const { effective, base, oocMoveSpeed, buffedStats } = derived;
  if (!effective || !base) return null;

  const speedsDiffer = oocMoveSpeed != null && oocMoveSpeed !== effective.moveSpeed;

  return (
    <>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
        {STAT_ROWS.map((row) => {
          if (speedsDiffer && row.key === "moveSpeed") {
            return <div key={row.key} aria-hidden />;
          }
          const eff = effective[row.key];
          const delta = eff - base[row.key];
          const buffed = buffedStats.has(row.key);
          return (
            <div
              key={row.key}
              className={`flex items-baseline justify-between border-b py-1 ${buffed ? "border-as-border" : "border-line-soft"}`}
            >
              <dt className="text-sm text-muted">
                {row.label}
                {buffed && (
                  <span className="ml-1 align-middle text-[9px] font-bold uppercase text-as-ink">
                    buff
                  </span>
                )}
              </dt>
              <dd
                className={`min-w-0 text-right font-mono text-sm font-semibold ${buffed ? "text-as-ink" : "text-ink"}`}
              >
                {row.key === "moveSpeed" ? formatMoveSpeed(eff) : formatStat(eff, row.kind)}
                {Math.abs(delta) > 1e-9 && (
                  <span
                    className={`ml-1 text-xs font-normal ${delta >= 0 ? "text-pos" : "text-neg"}`}
                  >
                    ({formatExactDelta(delta, row.kind)})
                  </span>
                )}
                {row.key === "moveSpeed" && <MoveSpeedSofteningMark speed={eff} />}
              </dd>
            </div>
          );
        })}
        {speedsDiffer && oocMoveSpeed != null && (
          <SplitSpeedCells
            inCombat={effective.moveSpeed}
            noCombat={oocMoveSpeed}
            inDelta={effective.moveSpeed - base.moveSpeed}
            noDelta={oocMoveSpeed - base.moveSpeed}
            inBuffed={buffedStats.has("moveSpeed")}
          />
        )}
      </dl>
    </>
  );
}
