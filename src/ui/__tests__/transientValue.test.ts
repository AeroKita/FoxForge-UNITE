import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTransientValue } from "../transientValue";

describe("createTransientValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("show(v) emits v", () => {
    const onChange = vi.fn();
    const c = createTransientValue(onChange, 1500);
    c.show("hello");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("emits null after ms", () => {
    const onChange = vi.fn();
    const c = createTransientValue(onChange, 1500);
    c.show("hello");
    vi.advanceTimersByTime(1499);
    expect(onChange).not.toHaveBeenCalledWith(null);
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("a second show inside the window emits the new value and clears only ms after the second call", () => {
    const onChange = vi.fn();
    const c = createTransientValue(onChange, 1500);
    c.show("first");
    vi.advanceTimersByTime(700);
    c.show("second");
    expect(onChange).toHaveBeenLastCalledWith("second");
    vi.advanceTimersByTime(1499);
    expect(onChange).not.toHaveBeenCalledWith(null);
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(onChange.mock.calls.filter((c) => c[0] === null)).toHaveLength(1);
  });

  it("dispose() before expiry means null is never emitted", () => {
    const onChange = vi.fn();
    const c = createTransientValue(onChange, 1500);
    c.show("hello");
    c.dispose();
    vi.advanceTimersByTime(5000);
    expect(onChange).not.toHaveBeenCalledWith(null);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("show after dispose still works (dispose only cancels the pending clear)", () => {
    const onChange = vi.fn();
    const c = createTransientValue(onChange, 1500);
    c.show("first");
    c.dispose();
    c.show("second");
    expect(onChange).toHaveBeenLastCalledWith("second");
    vi.advanceTimersByTime(1500);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
