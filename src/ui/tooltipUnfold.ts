/** Duration of the touch-tooltip unfold and fold. Matches the Aura Cannon panel grow. */
export const TIP_UNFOLD_MS = 200;

export type TipPhase = "closed" | "open" | "closing";

export type TipPhaseEvent = "show" | "dismiss" | "finished";

export const TIP_SHELL_OPEN_CLASS = "tip-unfold";
export const TIP_SHELL_CLOSE_CLASS = "tip-fold";
export const TIP_BACKDROP_OPEN_CLASS = "tip-unfold-backdrop";
export const TIP_BACKDROP_CLOSE_CLASS = "tip-fold-backdrop";

/**
 * Next phase for the pinned touch tooltip.
 * Reduced motion dismisses straight to closed so the UI does not wait on
 * animationend, which does not fire when the animation is disabled.
 */
export function nextTipPhase(
  phase: TipPhase,
  event: TipPhaseEvent,
  reducedMotion: boolean,
): TipPhase {
  if (event === "show") {
    if (phase === "closed" || phase === "closing") return "open";
    return phase;
  }
  if (event === "dismiss") {
    if (phase === "open") return reducedMotion ? "closed" : "closing";
    return phase;
  }
  if (phase === "closing") return "closed";
  return phase;
}

/** True while the popup node must stay in the tree, including during the fold. */
export function tipPopupMounted(phase: TipPhase): boolean {
  return phase === "open" || phase === "closing";
}

/** Shell animation class for the current phase. Empty when nothing is showing. */
export function tipShellClass(phase: TipPhase): string {
  if (phase === "open") return TIP_SHELL_OPEN_CLASS;
  if (phase === "closing") return TIP_SHELL_CLOSE_CLASS;
  return "";
}

/** Backdrop animation class for the current phase. Empty when nothing is showing. */
export function tipBackdropClass(phase: TipPhase): string {
  if (phase === "open") return TIP_BACKDROP_OPEN_CLASS;
  if (phase === "closing") return TIP_BACKDROP_CLOSE_CLASS;
  return "";
}

/** True when the user asked the OS to minimize motion. False when matchMedia is absent. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
