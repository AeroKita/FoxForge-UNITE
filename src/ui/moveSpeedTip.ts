/**
 * Copy and placement for the in-match movement-speed note.
 * The battle curve changes displayed speed outside 2,500–5,000:
 * values under 2,500 are raised, and values over 5,000 grow more slowly,
 * with another step down above 5,700.
 */

const BASIC_ABOVE = "Above 5,000, extra Speed has a reduced effect.";
const ADVANCED_ABOVE =
  "Movement Speed gains are reduced above 5,000 (80%) and again above 5,700 (50%).";

/** Sighted and screen-reader copy. Null inside the unchanged band. */
export function moveSpeedSofteningCopy(displayed: number, advanced: boolean): string | null {
  if (displayed > 5000) return advanced ? ADVANCED_ABOVE : BASIC_ABOVE;
  if (displayed < 2500) {
    return "Below 2,500, movement speed in battle is higher than the raw total.";
  }
  return null;
}

/**
 * Horizontal center for a fixed tooltip so the whole box stays on screen.
 * `anchorCenter` is the trigger's midpoint in viewport pixels.
 */
export function clampTooltipCenter(
  anchorCenter: number,
  viewportWidth: number,
  tooltipWidth: number,
  margin = 12,
): number {
  const half = tooltipWidth / 2;
  const min = margin + half;
  const max = viewportWidth - margin - half;
  if (max < min) return viewportWidth / 2;
  return Math.min(max, Math.max(min, anchorCenter));
}

/** Open upward when the trigger has room for the tip; otherwise open downward. */
export function tooltipOpensAbove(anchorTop: number, tooltipHeight: number, margin = 12): boolean {
  return anchorTop >= tooltipHeight + margin;
}
