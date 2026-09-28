import { MarqueeText } from "../ui/MarqueeText";

/**
 * Name/path pager on the Builds card.
 *
 * Several builds sit on a lifted tray with the original outline arrows and a
 * position chip. A single build is plain caption text: no arrows, no tray,
 * because there is nothing to operate.
 */

export function canCycleBuilds(count: number): boolean {
  return count >= 2;
}

/** `1/2` chip. Null when there is no other build — the count stays out of the title. */
export function buildVariantPositionLabel(index: number, count: number): string | null {
  if (!canCycleBuilds(count)) return null;
  const safe = Math.min(Math.max(index, 0), count - 1);
  return `${safe + 1}/${count}`;
}

export function buildVariantPagerLabel(index: number, count: number): string {
  if (!canCycleBuilds(count)) return "Only build";
  const safe = Math.min(Math.max(index, 0), count - 1);
  return `Build ${safe + 1} of ${count}`;
}

export const BUILD_VARIANT_PAGER_CLASS = {
  trayCycling:
    "mb-3 flex items-center gap-1 rounded-xl bg-surface p-1 shadow-sm ring-1 ring-accent/55 dark:bg-raise dark:shadow-none dark:ring-accent",
  traySolo: "mb-3 flex items-center",
  title: "flex-1 px-1 text-sm text-muted",
  titleSolo: "flex-1 text-xs text-muted",
  position:
    "mr-0.5 shrink-0 rounded-md bg-accent-weak px-1.5 py-0.5 text-xs font-bold tabular-nums text-accent-ink",
  arrowCycling:
    "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-line text-lg text-ink hover:bg-raise",
} as const;

export function BuildVariantPager({
  name,
  lane,
  index,
  count,
  onPrevious,
  onNext,
}: {
  name: string;
  lane?: string;
  index: number;
  count: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const cycling = canCycleBuilds(count);
  const position = buildVariantPositionLabel(index, count);
  const title = (
    <MarqueeText
      className={cycling ? BUILD_VARIANT_PAGER_CLASS.title : BUILD_VARIANT_PAGER_CLASS.titleSolo}
    >
      <span className="font-semibold text-ink">{name || "—"}</span>
      {lane ? ` · ${lane}` : ""}
    </MarqueeText>
  );

  if (!cycling) {
    return (
      <div
        role="group"
        aria-label={buildVariantPagerLabel(index, count)}
        className={BUILD_VARIANT_PAGER_CLASS.traySolo}
      >
        {title}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={buildVariantPagerLabel(index, count)}
      className={BUILD_VARIANT_PAGER_CLASS.trayCycling}
    >
      <button
        type="button"
        onClick={onPrevious}
        aria-label="Previous build"
        className={BUILD_VARIANT_PAGER_CLASS.arrowCycling}
      >
        ‹
      </button>
      {title}
      {position ? (
        <span className={BUILD_VARIANT_PAGER_CLASS.position} aria-hidden>
          {position}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onNext}
        aria-label="Next build"
        className={BUILD_VARIANT_PAGER_CLASS.arrowCycling}
      >
        ›
      </button>
    </div>
  );
}
