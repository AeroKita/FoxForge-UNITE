// Transient UI value: show a value, then clear it after `ms`. The controller is
// the tested unit (Vitest runs in node). Optimizer `showToast` in
// `src/state/useEmblemOptimizer.ts` already implements this shape inline; do
// not refactor it in this batch.

import { useCallback, useEffect, useRef, useState } from "react";

export interface TransientController<T> {
  show(value: T): void; // sets value; restarts the clear timer
  dispose(): void; // cancels any pending clear; does not emit
}

export function createTransientValue<T>(
  onChange: (value: T | null) => void,
  ms: number,
  timers: Pick<typeof globalThis, "setTimeout" | "clearTimeout"> = globalThis,
): TransientController<T> {
  let timer: ReturnType<typeof timers.setTimeout> | undefined;
  return {
    show(value) {
      if (timer !== undefined) timers.clearTimeout(timer);
      onChange(value);
      timer = timers.setTimeout(() => {
        timer = undefined;
        onChange(null);
      }, ms);
    },
    dispose() {
      if (timer !== undefined) {
        timers.clearTimeout(timer);
        timer = undefined;
      }
    },
  };
}

/** React wrapper: `const [loadedId, flashLoaded] = useTransientValue<string>(1500)`. */
export function useTransientValue<T>(ms: number): [T | null, (value: T) => void] {
  const [value, setValue] = useState<T | null>(null);
  const controllerRef = useRef<TransientController<T> | null>(null);
  if (controllerRef.current == null) {
    controllerRef.current = createTransientValue(setValue, ms);
  }
  useEffect(() => () => controllerRef.current?.dispose(), []);
  const show = useCallback((next: T) => {
    controllerRef.current?.show(next);
  }, []);
  return [value, show];
}
