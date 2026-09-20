/** How touch/pen opens the pinned tooltip popup. Mouse still uses CSS hover. */
export type TooltipTouchTrigger = "long-press" | "tap";

export const DEFAULT_TOOLTIP_TOUCH_TRIGGER: TooltipTouchTrigger = "long-press";

/**
 * True when this pointer should use the touch tooltip path (not mouse hover).
 */
export function isTouchLikePointer(pointerType: string): boolean {
  return pointerType === "touch" || pointerType === "pen";
}

/**
 * True when a long-press timer should start for this trigger + pointer.
 */
export function shouldStartLongPressTimer(
  trigger: TooltipTouchTrigger,
  pointerType: string,
): boolean {
  return trigger === "long-press" && isTouchLikePointer(pointerType);
}

/**
 * True when a completed touch/pen click should pin the tooltip popup.
 * False when the popup is already open so the backdrop click can dismiss it.
 */
export function shouldPinOnTouchClick(
  trigger: TooltipTouchTrigger,
  pointerType: string,
  pinned = false,
): boolean {
  return !pinned && trigger === "tap" && isTouchLikePointer(pointerType);
}
