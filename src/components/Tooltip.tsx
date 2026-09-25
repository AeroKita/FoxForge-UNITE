import { type ReactNode, useEffect, useRef, useState } from "react";
import { useModalDismiss } from "../ui/useModalDismiss";
import {
  DEFAULT_TOOLTIP_TOUCH_TRIGGER,
  shouldPinOnTouchClick,
  shouldStartLongPressTimer,
  type TooltipTouchTrigger,
} from "../ui/tooltipTouch";
import {
  TIP_UNFOLD_MS,
  nextTipPhase,
  prefersReducedMotion,
  tipBackdropClass,
  tipLocksScroll,
  tipPopupMounted,
  tipScrollPassClass,
  tipShellClass,
  type TipPhase,
} from "../ui/tooltipUnfold";

const LONG_PRESS_MS = 500;

export type { TooltipTouchTrigger };

// Lightweight CSS hover tooltip (no deps). Renders a styled popup on hover/focus.
// Touch/pen: long-press (default) or tap (`touchTrigger="tap"`) opens the same
// content in a dismissible modal popup.
// Use inside containers that don't clip overflow (panels, not scroll lists).
export function Tooltip({
  content,
  children,
  side = "bottom",
  className = "",
  touchTrigger = DEFAULT_TOOLTIP_TOUCH_TRIGGER,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
  touchTrigger?: TooltipTouchTrigger;
}) {
  const pos = side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5";
  const [phase, setPhase] = useState<TipPhase>("closed");
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  const pointerTypeRef = useRef("");
  const mounted = tipPopupMounted(phase);

  const request = (event: "show" | "dismiss" | "finished") => {
    setPhase((current) => nextTipPhase(current, event, prefersReducedMotion()));
  };

  useModalDismiss(() => request("dismiss"), tipLocksScroll(phase));

  useEffect(() => {
    if (phase !== "closing") return;
    const id = window.setTimeout(() => request("finished"), TIP_UNFOLD_MS + 80);
    return () => window.clearTimeout(id);
  }, [phase]);

  const clearTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    firedRef.current = false;
    pointerTypeRef.current = e.pointerType;
    if (!shouldStartLongPressTimer(touchTrigger, e.pointerType)) return;
    start.current = { x: e.clientX, y: e.clientY };
    clearTimer();
    timer.current = window.setTimeout(() => {
      firedRef.current = true;
      request("show");
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clearTimer();
  };

  const cancel = () => {
    clearTimer();
    start.current = null;
  };

  return (
    <span
      className={`group/tt relative inline-flex select-none [-webkit-touch-callout:none] ${touchTrigger === "tap" ? "cursor-pointer" : ""} ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onClickCapture={(e) => {
        if (firedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          firedRef.current = false;
          return;
        }
        if (shouldPinOnTouchClick(touchTrigger, pointerTypeRef.current, phase !== "closed")) {
          e.preventDefault();
          e.stopPropagation();
          request("show");
        }
      }}
    >
      {children}
      <span
        role="tooltip"
        style={{ background: "var(--color-tip-bg)", color: "var(--color-tip-ink)" }}
        className={`pointer-events-none absolute left-1/2 z-50 hidden w-max max-w-[240px] -translate-x-1/2 ${pos} whitespace-pre-line rounded-lg px-2.5 py-1.5 text-left text-[11px] leading-snug shadow-xl ring-1 ring-black/10 group-hover/tt:block`}
      >
        {content}
      </span>

      {mounted && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${tipScrollPassClass(phase)}`}
        >
          <div
            className={`absolute inset-0 bg-black/40 ${tipBackdropClass(phase)}`}
            onClick={() => request("dismiss")}
          />
          <div
            className={`relative max-h-[70vh] w-full max-w-sm origin-center overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-xl ${tipShellClass(phase)}`}
            onAnimationEnd={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.animationName === "tip-fold") request("finished");
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className={`whitespace-pre-line text-sm leading-snug text-ink ${phase === "closing" ? "tip-fold-ink" : "tip-unfold-ink"}`}
            >
              {content}
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
