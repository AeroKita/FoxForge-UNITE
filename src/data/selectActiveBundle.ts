import { ZodError } from "zod";

/**
 * Choose the bundle to run. The shipped baseline is already validated in CI,
 * so a runtime zod parse of those exact bytes is skipped. A cached remote
 * copy can come from another schema version and is still parsed; a mismatch
 * falls back to the baseline.
 */
export function selectActiveBundle<T>(
  baseline: T,
  raw: unknown,
  parse: (raw: unknown) => T,
): { bundle: T; rejectedCache: boolean } {
  if (raw === baseline) return { bundle: baseline, rejectedCache: false };
  try {
    return { bundle: parse(raw), rejectedCache: false };
  } catch (e) {
    if (e instanceof ZodError) return { bundle: baseline, rejectedCache: true };
    throw e;
  }
}
