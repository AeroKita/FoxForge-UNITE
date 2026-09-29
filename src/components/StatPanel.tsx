import { useMemo } from "react";
import { useStore } from "../state/store";
import { deriveBuild } from "../engine/derive";
import { effectiveHp } from "../engine/formulas";
import { boostAvailableAtLevel } from "../engine/effects";
import { boostLevelGate, formatBoostEffect } from "../ui/boostEffectText";
import { offenseFor } from "../ui/offense";
import { CollapsibleCard } from "./CollapsibleCard";
import { EffectiveStatsGrid } from "./EffectiveStatsGrid";

export function StatPanel() {
  const { loadout, dispatch, expert, heldSlotGrades } = useStore();
  const derived = useMemo(
    () => deriveBuild(loadout, true, heldSlotGrades),
    [loadout, heldSlotGrades],
  );
  const { pokemon, effective, base, attackSpeed, availableBoosts } = derived;

  if (!pokemon || !effective || !base || !attackSpeed) return null;
  if (!expert) return null;

  const activeIds = new Set(loadout.activeBoostIds);
  const offenseStat = offenseFor(pokemon.attackType, effective).value;

  return (
    <div className="flex flex-col gap-3">
      {expert && (
        <CollapsibleCard title="Effective Stats" persistKey="stats">
          <EffectiveStatsGrid derived={derived} />
        </CollapsibleCard>
      )}

      {expert && (
        <CollapsibleCard title="Attack Speed" persistKey="attackspeed" tone="amber">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="AS Stat" value={`${attackSpeed.asPoints.toFixed(1)}%`} />
            <Metric label="Frames / atk" value={String(attackSpeed.frames)} />
            <Metric label="Attacks / sec" value={attackSpeed.attacksPerSecond.toFixed(2)} />
          </div>
        </CollapsibleCard>
      )}

      {expert && (
        <CollapsibleCard title="Combat Analytics" persistKey="analytics" tone="sky">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric
              tone="sky"
              label="Physical eHP"
              value={Math.round(effectiveHp(effective.hp, effective.defense)).toLocaleString()}
            />
            <Metric
              tone="sky"
              label="Special eHP"
              value={Math.round(effectiveHp(effective.hp, effective.spDefense)).toLocaleString()}
            />
            <Metric
              tone="sky"
              label="Basic ATK/s*"
              value={Math.round(offenseStat * attackSpeed.attacksPerSecond).toLocaleString()}
            />
          </div>
          <p className="mt-2 text-[10px] text-faint">
            eHP = HP × (1 + Def/600). *Basic ATK/s is a relative index (offense × attacks/sec), for
            comparing builds — not in-game damage.
          </p>
        </CollapsibleCard>
      )}

      {expert && (
        <CollapsibleCard title="Active Effects" persistKey="effects">
          <p className="mb-3 text-xs text-faint">
            Off by default. Toggle a buff to include it in effective stats and the level charts.
          </p>
          {availableBoosts.length === 0 ? (
            <p className="text-sm text-faint">No toggleable effects for this loadout.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {availableBoosts.map((b) => {
                const avail = boostAvailableAtLevel(b, loadout.level);
                const on = activeIds.has(b.id);
                return (
                  <li key={b.id}>
                    <button
                      disabled={!avail}
                      onClick={() => dispatch({ type: "toggleBoost", id: b.id })}
                      title={b.note ?? ""}
                      className={`flex min-h-11 w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition
                      ${on ? "border-accent bg-accent-weak" : "border-line bg-surface hover:border-line"}
                      ${!avail ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-3 w-3 rounded-full ${on ? "bg-accent" : "bg-faint"}`}
                        />
                        <span className="font-medium text-ink">{b.label}</span>
                        <span className="text-xs uppercase text-faint">{b.source}</span>
                      </span>
                      <span className="max-w-[14rem] text-right font-mono text-xs leading-snug whitespace-normal text-muted">
                        {formatBoostEffect(b, loadout.level)}
                        {boostLevelGate(b, loadout.level)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CollapsibleCard>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "amber",
}: {
  label: string;
  value: string;
  tone?: "amber" | "sky";
}) {
  const tones = {
    amber: { val: "text-as-ink", lbl: "text-as-ink", bg: "bg-surface/70" },
    sky: { val: "text-an-ink", lbl: "text-an-ink", bg: "bg-an-bg" },
  }[tone];
  return (
    <div className={`rounded-lg p-2 ${tones.bg}`}>
      <div className={`font-mono text-lg font-bold ${tones.val}`}>{value}</div>
      <div className={`text-xs ${tones.lbl}`}>{label}</div>
    </div>
  );
}
