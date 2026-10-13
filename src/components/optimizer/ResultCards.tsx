import { useEffect, useMemo, useState } from "react";
import { emblemById, setBonuses } from "../../data/gameData";
import { deriveEmblemLoadoutImpact } from "../../engine/emblemSearch/pokemonScore";
import type { EmblemGrade } from "../../types";
import { STAT_ROWS, formatExactDelta, formatMoveSpeed, formatStat } from "../../ui/format";
import { slotsFromPicks } from "../../ui/emblemWheel";
import { MoveSpeedSofteningMark, SplitSpeedCells } from "../EffectiveStatsGrid";
import { CollapsibleCard } from "../CollapsibleCard";
import { EmblemSetSummary } from "../EmblemSetSummary";
import { EmblemCoinRow } from "../EmblemCoinRow";
import { type AppliedState, type EffectiveDelta, type OptimizerPokemon } from "./shared";

export interface ResultPanelProps {
  picks: { emblemId: string; grade: EmblemGrade }[];
  searchResult: { phase: string; candidates: number; totalMs: number; error?: number } | null;
  pokemon: OptimizerPokemon;
  /** Level the search was run at — preview slider defaults here. */
  searchLevel: number;
  applied: AppliedState;
  historyCount: number;
  historyIndex: number;
  onGoHistory: (delta: number) => void;
  onClearResults: () => void;
  onApplyEmblems: () => void;
}

function picksKey(picks: { emblemId: string; grade: EmblemGrade }[]): string {
  return picks.map((p) => `${p.emblemId}:${p.grade}`).join(",");
}

export function ResultCards({
  picks,
  searchResult,
  pokemon,
  searchLevel,
  applied,
  historyCount,
  historyIndex,
  onGoHistory,
  onClearResults,
  onApplyEmblems,
}: ResultPanelProps) {
  const [previewLevel, setPreviewLevel] = useState(searchLevel);
  const buildKey = useMemo(() => picksKey(picks), [picks]);

  useEffect(() => {
    setPreviewLevel(searchLevel);
  }, [searchLevel, buildKey]);

  const impact = useMemo(() => {
    if (!picks.length || !pokemon) return null;
    try {
      return deriveEmblemLoadoutImpact(pokemon, previewLevel, picks, setBonuses);
    } catch {
      return null;
    }
  }, [picks, pokemon, previewLevel]);

  const effectiveDelta = useMemo((): EffectiveDelta | null => {
    if (!impact || Object.keys(impact.emblemDelta).length === 0) return null;
    return {
      effective: impact.effective,
      delta: impact.emblemDelta,
      emblemLoadout: impact.emblemLoadout,
      oocMoveSpeed: impact.oocMoveSpeed,
    };
  }, [impact]);

  const previewingOtherLevel = previewLevel !== searchLevel;
  const speedsDiffer =
    effectiveDelta?.oocMoveSpeed != null &&
    effectiveDelta.oocMoveSpeed !== effectiveDelta.effective.moveSpeed;

  return (
    <CollapsibleCard
      title="Results"
      persistKey="optimizer-results"
      tone="indigo"
      center={
        <button
          type="button"
          onClick={onClearResults}
          aria-label="Clear Results"
          className="min-h-11 rounded-lg bg-neg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neg/90 active:scale-[0.98]"
        >
          Clear Results
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        {historyCount > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onGoHistory(-1)}
              disabled={historyIndex <= 0}
              aria-label="Previous build"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-line text-lg text-ink hover:bg-raise disabled:opacity-30"
            >
              ‹
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-xs text-muted">
              <span className="font-semibold text-ink">Build {historyIndex + 1}</span>
              {historyCount > 1 ? ` · ${historyIndex + 1}/${historyCount}` : ""}
            </p>
            <button
              type="button"
              onClick={() => onGoHistory(1)}
              disabled={historyIndex >= historyCount - 1}
              aria-label="Next build"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-line text-lg text-ink hover:bg-raise disabled:opacity-30"
            >
              ›
            </button>
          </div>
        )}

        {historyCount > 1 && historyIndex < historyCount - 1 && (
          <p className="text-center text-xs text-accent-ink">New results — tap › to view</p>
        )}

        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-medium text-faint">Emblems</p>
          <EmblemCoinRow slots={slotsFromPicks(picks, (id) => emblemById.get(id))} />
        </div>

        <EmblemSetSummary picks={picks} />

        {effectiveDelta && pokemon && (
          <div className="rounded-xl border border-line-soft bg-surface/60 p-3 ring-1 ring-line/40">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                  Effective stats
                </p>
                <p className="mt-0.5 truncate text-sm text-muted">{pokemon.displayName}</p>
              </div>
              <span className="shrink-0 rounded-md bg-grade-badge px-2.5 py-0.5 font-mono text-sm font-bold text-white tabular-nums">
                Lv {previewLevel}
              </span>
            </div>

            <div className="py-2">
              <input
                type="range"
                min={1}
                max={15}
                step={1}
                value={previewLevel}
                onChange={(e) => setPreviewLevel(Number(e.target.value))}
                aria-label="Preview level"
                className="block w-full accent-accent"
              />
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-faint">
              {previewingOtherLevel ? (
                <>
                  <span>
                    Previewing Lv {previewLevel} · search used Lv {searchLevel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewLevel(searchLevel)}
                    className="font-medium text-accent-ink underline decoration-accent-ink/40 underline-offset-2 hover:decoration-accent-ink"
                  >
                    Reset
                  </button>
                </>
              ) : (
                <span>Search level — slide to compare other levels</span>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-0 sm:grid-cols-3">
              {STAT_ROWS.map((row) => {
                if (speedsDiffer && row.key === "moveSpeed") return null;
                const eff = effectiveDelta.effective[row.key];
                const delta = effectiveDelta.delta[row.key];
                return (
                  <div
                    key={row.key}
                    className="flex items-baseline justify-between border-b border-line-soft py-1"
                  >
                    <dt className="text-sm text-muted">{row.label}</dt>
                    <dd className="text-right font-mono text-sm font-semibold text-ink">
                      {row.key === "moveSpeed" ? formatMoveSpeed(eff) : formatStat(eff, row.kind)}
                      {delta !== undefined && (
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
            </dl>
            {speedsDiffer && effectiveDelta.oocMoveSpeed != null && (
              <dl className="mt-2 grid grid-cols-2 gap-x-6">
                <SplitSpeedCells
                  inCombat={effectiveDelta.effective.moveSpeed}
                  noCombat={effectiveDelta.oocMoveSpeed}
                  inDelta={effectiveDelta.delta.moveSpeed ?? 0}
                  noDelta={effectiveDelta.oocMoveSpeed - effectiveDelta.effective.moveSpeed}
                  inBuffed={false}
                />
              </dl>
            )}
            {effectiveDelta.emblemLoadout.activeSetBonuses.some((b) => b.color === "yellow") && (
              <p className="mt-1 text-xs text-faint">
                Yellow set bonus applies only out of combat.
              </p>
            )}
          </div>
        )}

        {searchResult?.error !== undefined && (
          <p className="text-xs text-muted">
            Target error:{" "}
            <span className={`font-mono ${searchResult.error < 0.01 ? "text-pos" : "text-neg"}`}>
              {searchResult.error.toFixed(3)}
            </span>
            {searchResult.error < 0.01 && " (exact)"}
          </p>
        )}

        <div className="flex flex-col gap-4 border-t border-line-soft pt-4">
          <button
            type="button"
            onClick={onApplyEmblems}
            className="flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-accent/90 active:scale-[0.98] sm:w-auto"
          >
            {applied.emblems ? "Applied ✓ — Re-apply Emblems" : "Apply Emblems"}
          </button>
          <p className="text-xs text-faint">
            Applies to your current loadout without leaving this page. Switch to the Build tab
            anytime to review.
          </p>
        </div>
      </div>
    </CollapsibleCard>
  );
}
