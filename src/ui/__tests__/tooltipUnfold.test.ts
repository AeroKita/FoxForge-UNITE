import { describe, expect, it } from "vitest";
import {
  TIP_BACKDROP_CLOSE_CLASS,
  TIP_BACKDROP_OPEN_CLASS,
  TIP_SHELL_CLOSE_CLASS,
  TIP_SHELL_OPEN_CLASS,
  TIP_UNFOLD_MS,
  nextTipPhase,
  tipBackdropClass,
  tipPopupMounted,
  tipShellClass,
} from "../tooltipUnfold";

describe("tooltip unfold phase", () => {
  it("uses a 200ms unfold, matching the Aura Cannon panel grow", () => {
    expect(TIP_UNFOLD_MS).toBe(200);
  });

  it("opens from closed, and a second show stays open", () => {
    expect(nextTipPhase("closed", "show", false)).toBe("open");
    expect(nextTipPhase("open", "show", false)).toBe("open");
    expect(nextTipPhase("open", "show", true)).toBe("open");
  });

  it("folds on dismiss, and skips the fold when motion is reduced", () => {
    expect(nextTipPhase("open", "dismiss", false)).toBe("closing");
    expect(nextTipPhase("open", "dismiss", true)).toBe("closed");
  });

  it("unmounts only when the fold animation finishes", () => {
    expect(nextTipPhase("closing", "finished", false)).toBe("closed");
    expect(nextTipPhase("open", "finished", false)).toBe("open");
  });

  it("ignores a second dismiss while already closing", () => {
    expect(nextTipPhase("closing", "dismiss", false)).toBe("closing");
  });

  it("lets a new show cancel an in-progress fold", () => {
    expect(nextTipPhase("closing", "show", false)).toBe("open");
  });

  it("stays closed when dismiss or finished arrives with nothing showing", () => {
    expect(nextTipPhase("closed", "dismiss", false)).toBe("closed");
    expect(nextTipPhase("closed", "finished", false)).toBe("closed");
    expect(nextTipPhase("closed", "dismiss", true)).toBe("closed");
  });

  it("keeps the popup mounted through the fold so the close can play", () => {
    expect(tipPopupMounted("closed")).toBe(false);
    expect(tipPopupMounted("open")).toBe(true);
    expect(tipPopupMounted("closing")).toBe(true);
  });

  it("assigns the unfold class only while open and the fold class only while closing", () => {
    expect(tipShellClass("open")).toBe(TIP_SHELL_OPEN_CLASS);
    expect(tipShellClass("closing")).toBe(TIP_SHELL_CLOSE_CLASS);
    expect(tipShellClass("closed")).toBe("");
    expect(TIP_SHELL_OPEN_CLASS).toBe("tip-unfold");
    expect(TIP_SHELL_CLOSE_CLASS).toBe("tip-fold");
  });

  it("assigns backdrop classes the same way as the shell", () => {
    expect(tipBackdropClass("open")).toBe(TIP_BACKDROP_OPEN_CLASS);
    expect(tipBackdropClass("closing")).toBe(TIP_BACKDROP_CLOSE_CLASS);
    expect(tipBackdropClass("closed")).toBe("");
    expect(TIP_BACKDROP_OPEN_CLASS).toBe("tip-unfold-backdrop");
    expect(TIP_BACKDROP_CLOSE_CLASS).toBe("tip-fold-backdrop");
  });
});
