/** Which compare lane a control belongs to. A is the cool accent, B the warm amber. */
export type CompareSide = "A" | "B";

/**
 * Frame for the build identity row (current working build, preset Pokémon,
 * or saved loadout). The border color is the same token the radar strokes.
 *
 * Min height is the preset chip's h-8 icon (2rem) plus that row's py-2 (1rem)
 * and this border-2 (4px). A text-only row, such as the current working build,
 * then lines up with the chip that shows a Pokémon.
 */
export function compareIdentityClass(side: CompareSide): string {
  const color = side === "A" ? "border-compare-a" : "border-compare-b";
  return `min-h-[calc(2rem+1rem+4px)] border-2 ${color} bg-surface`;
}

/**
 * Wash for one stat column, from the A/B header through Attacks / sec.
 * The delta column stays uncolored so better/worse remains its own signal.
 */
export function compareColumnClass(side: CompareSide): string {
  const wash = side === "A" ? "bg-compare-a-wash" : "bg-compare-b-wash";
  return `${wash} px-2`;
}

/** Radar stroke and fill. Resolves through the theme token, not a hardcoded hex. */
export function compareChartColor(side: CompareSide): string {
  return side === "A" ? "var(--color-compare-a)" : "var(--color-compare-b)";
}

/** Legend dot. Same token as {@link compareChartColor}. */
export function compareSwatchClass(side: CompareSide): string {
  return side === "A" ? "bg-compare-a" : "bg-compare-b";
}
