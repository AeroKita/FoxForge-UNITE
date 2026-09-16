import type { DerivedBuild } from "../engine/derive";
import { STAT_ROWS, formatStat, formatExactDelta } from "../ui/format";
import { formatActiveSetBonuses } from "../ui/setProgress";

/** Shared 10-stat grid with deltas, OOC move speed, and set-bonus footnotes. */
export function EffectiveStatsGrid({ derived }: { derived: DerivedBuild }) {
  const { effective, base, oocMoveSpeed, emblemLoadout, buffedStats } = derived;
  if (!effective || !base) return null;

  return (
    <>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
        {STAT_ROWS.map((row) => {
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
                {formatStat(eff, row.kind)}
                {Math.abs(delta) > 1e-9 && (
                  <span
                    className={`ml-1 text-xs font-normal ${delta >= 0 ? "text-pos" : "text-neg"}`}
                  >
                    ({formatExactDelta(delta, row.kind)})
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-2 text-xs text-faint">
        Out-of-combat move speed:{" "}
        <span className="font-mono">{oocMoveSpeed?.toLocaleString()}</span>
        {oocMoveSpeed != null && oocMoveSpeed > effective.moveSpeed && (
          <span className="ml-1 text-pos">
            ({formatExactDelta(oocMoveSpeed - effective.moveSpeed, "int")})
          </span>
        )}
        {emblemLoadout.activeSetBonuses.length > 0 && (
          <> · Set bonuses: {formatActiveSetBonuses(emblemLoadout.activeSetBonuses)}</>
        )}
      </p>
      <p className="mt-1 text-xs text-faint">
        Yellow set bonus and Float Stone apply only out of combat.
      </p>
    </>
  );
}
