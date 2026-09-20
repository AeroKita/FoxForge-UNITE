import { describe, it, expect } from "vitest";
import {
  DEFAULT_TOOLTIP_TOUCH_TRIGGER,
  isTouchLikePointer,
  shouldPinOnTouchClick,
  shouldStartLongPressTimer,
} from "../tooltipTouch";

describe("tooltip touch trigger", () => {
  it("defaults to long-press so existing callers keep hold-to-open", () => {
    expect(DEFAULT_TOOLTIP_TOUCH_TRIGGER).toBe("long-press");
  });

  it("treats touch and pen as touch-like, not mouse", () => {
    expect(isTouchLikePointer("touch")).toBe(true);
    expect(isTouchLikePointer("pen")).toBe(true);
    expect(isTouchLikePointer("mouse")).toBe(false);
  });

  it("starts a long-press timer only for long-press + touch-like pointers", () => {
    expect(shouldStartLongPressTimer("long-press", "touch")).toBe(true);
    expect(shouldStartLongPressTimer("long-press", "pen")).toBe(true);
    expect(shouldStartLongPressTimer("long-press", "mouse")).toBe(false);
    expect(shouldStartLongPressTimer("tap", "touch")).toBe(false);
    expect(shouldStartLongPressTimer("tap", "mouse")).toBe(false);
  });

  it("pins on click only for tap + touch-like pointers", () => {
    expect(shouldPinOnTouchClick("tap", "touch")).toBe(true);
    expect(shouldPinOnTouchClick("tap", "pen")).toBe(true);
    expect(shouldPinOnTouchClick("tap", "mouse")).toBe(false);
    expect(shouldPinOnTouchClick("long-press", "touch")).toBe(false);
    expect(shouldPinOnTouchClick("long-press", "mouse")).toBe(false);
  });
});
