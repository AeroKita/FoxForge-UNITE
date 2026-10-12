import { useEffect, useId, useRef, useState } from "react";
import type { DerivedBuild } from "../engine/derive";
import { moveSpeedSoftened } from "../engine/formulas";
import { STAT_ROWS, formatExactDelta, formatMoveSpeed, formatStat } from "../ui/format";
import { formatActiveSetBonuses } from "../ui/setProgress";

function SofteningMark() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event.target instanceof Node && wrapRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="inline-flex align-middle">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Diminishing returns"
        aria-describedby={open ? tipId : undefined}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full font-sans text-[10px] font-bold leading-none text-muted ring-1 ring-line"
        onClick={(event) => {
          event.stopPropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          setPos({ top: rect.top, left: rect.left + rect.width / 2 });
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
            transform: "translate(-50%, calc(-100% - 6px))",
            background: "var(--color-tip-bg)",
            color: "var(--color-tip-ink)",
          }}
          className="z-[60] w-max max-w-[12rem] rounded-lg px-2 py-1 text-left font-sans text-[11px] leading-snug font-normal whitespace-normal shadow-xl ring-1 ring-black/10"
        >
          Diminishing returns softened this speed.
        </span>
      )}
    </span>
  );
}

/** Shown on a speed figure the in-match curve changed. */
export function MoveSpeedSofteningMark({ speed }: { speed: number }) {
  if (!moveSpeedSoftened(speed)) return null;
  return <SofteningMark />;
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
      className={`flex items-end justify-between border-b py-1 ${buffed ? "border-as-border" : "border-line-soft"}`}
    >
      <dt className="min-w-0 text-sm text-muted">
        <span className="block">
          Speed
          {buffed && (
            <span className="ml-1 align-middle text-[9px] font-bold uppercase text-as-ink">
              buff
            </span>
          )}
        </span>
        <span className="block text-xs">{qualifier}</span>
      </dt>
      <dd
        className={`shrink-0 text-right font-mono text-sm font-semibold whitespace-nowrap ${buffed ? "text-as-ink" : "text-ink"}`}
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

/** Two cells for a bottom row: in combat, then no combat. */
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
      <SpeedFace qualifier="no combat" value={noCombat} delta={noDelta} buffed={false} />
    </>
  );
}

/** Shared 10-stat grid. Speed splits into in-combat and no-combat cells when those differ. */
export function EffectiveStatsGrid({ derived }: { derived: DerivedBuild }) {
  const { effective, base, oocMoveSpeed, emblemLoadout, buffedStats } = derived;
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
                className={`text-right font-mono text-sm font-semibold ${buffed ? "text-as-ink" : "text-ink"}`}
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
      {emblemLoadout.activeSetBonuses.length > 0 && (
        <p className="mt-2 text-xs text-faint">
          Set bonuses: {formatActiveSetBonuses(emblemLoadout.activeSetBonuses)}
        </p>
      )}
    </>
  );
}
