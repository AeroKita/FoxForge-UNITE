import { useEffect, useRef, useState } from "react";
import { useModalDismiss } from "./useModalDismiss";
import { heldItemStatLines } from "./format";
import { statsAtGrade } from "../components/tips";
import type { HeldItem } from "../types";
import { activeTierIndex } from "../engine/formulas";
import {
  TIP_CLOSE_MS,
  nextTipPhase,
  prefersReducedMotion,
  tipBackdropClass,
  tipLocksScroll,
  tipPopupMounted,
  tipScrollPassClass,
  tipShellClass,
  type TipPhase,
} from "./tooltipUnfold";
export { activeTierIndex };

export function HeldItemDetailBody({ item, grade }: { item: HeldItem; grade: number }) {
  const statLines = heldItemStatLines(statsAtGrade(item, grade));
  const effect = item.effect;
  const active = activeTierIndex(grade);

  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed">
      <h3 id="held-item-detail-title" className="text-base font-bold text-ink">
        {item.displayName}
      </h3>

      {/* Flat stats at the current grade — green because they scale with the slider. */}
      {statLines.length > 0 && (
        <div className="flex flex-col gap-0.5 font-mono text-sm">
          {statLines.map((l) => (
            <span key={l.key} className="font-semibold text-pos">
              {l.label} {l.value}
            </span>
          ))}
        </div>
      )}

      {item.description && <p className="text-muted">{item.description}</p>}

      {/* Grade 1 / 10 / 20 effect scaling, with the tier active at this grade in green. */}
      {effect && (
        <div className="border-t border-line pt-3">
          <p className="font-mono text-sm">
            {effect.tiers.map((v, i) => (
              <span key={i}>
                {i > 0 && <span className="text-muted"> / </span>}
                <span className={i === active ? "font-semibold text-pos" : "text-muted"}>{v}</span>
              </span>
            ))}{" "}
            <span className="font-semibold text-pos">{effect.label}</span>
          </p>
          <p className="mt-1 font-mono text-xs text-muted">
            {[1, 10, 20].map((lvl, i) => (
              <span key={lvl}>
                {i > 0 && " / "}
                <span className={i === active ? "font-semibold text-pos" : ""}>{lvl}</span>
              </span>
            ))}{" "}
            <span className="font-semibold text-pos">Item Level</span>
          </p>
        </div>
      )}
    </div>
  );
}

export function HeldItemDetailModal({
  item,
  grade,
  open,
  onClose,
}: {
  item: HeldItem | null;
  grade: number;
  open: boolean;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<TipPhase>(open ? "open" : "closed");
  const shown = useRef<HeldItem | null>(item);
  if (item) shown.current = item;

  useEffect(() => {
    setPhase((current) => nextTipPhase(current, open ? "show" : "dismiss", prefersReducedMotion()));
  }, [open]);

  useEffect(() => {
    if (phase !== "closing") return;
    const id = window.setTimeout(() => {
      setPhase((current) => nextTipPhase(current, "finished", false));
    }, TIP_CLOSE_MS + 40);
    return () => window.clearTimeout(id);
  }, [phase]);

  useModalDismiss(onClose, tipLocksScroll(phase));

  const current = shown.current;
  if (!tipPopupMounted(phase) || !current) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${tipScrollPassClass(phase)}`}
    >
      <div
        className={`absolute inset-0 bg-black/50 ${tipBackdropClass(phase)}`}
        onClick={onClose}
      />
      <div
        className={`relative max-h-[85vh] w-full max-w-md origin-center overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-xl ${tipShellClass(phase)}`}
        onAnimationEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.animationName === "tip-fold") {
            setPhase((currentPhase) => nextTipPhase(currentPhase, "finished", false));
          }
        }}
        role="dialog"
        aria-labelledby="held-item-detail-title"
      >
        <div className={phase === "closing" ? "tip-fold-ink" : "tip-unfold-ink"}>
          <div className="mb-3 flex justify-end">
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg border border-line px-2 py-0.5 text-sm text-muted hover:bg-raise"
            >
              ✕
            </button>
          </div>
          <HeldItemDetailBody item={current} grade={grade} />
        </div>
      </div>
    </div>
  );
}
