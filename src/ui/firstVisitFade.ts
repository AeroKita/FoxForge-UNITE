/**
 * First-visit landing fade.
 *
 * A new trainer lands on the empty "choose a Pokémon" prompt. The shell fades
 * in so text and controls don't pop while art loads. A returning trainer who
 * already has a Pokémon selected skips the fade.
 */

/** How long the first-visit shell fade lasts. */
export const FIRST_VISIT_FADE_MS = 2000;

/** Class applied to the app shell on the empty landing. */
export const FIRST_VISIT_FADE_CLASS = "first-visit-fade";

/**
 * Shell class for the first paint of a visit.
 *
 * Call once from the initial loadout and tab. Keeping the class for the rest
 * of the visit lets the fade finish even if a Pokémon is chosen mid-animation.
 * Other tabs never fade, even when no Pokémon is selected yet.
 *
 * @param pokemonId - Pokémon already on the loadout, or null on the empty landing.
 * @param tab - Tab restored for this visit. Only `"build"` is the Select a Pokémon page.
 * @returns The fade class, or undefined when the fade should not run.
 */
export function firstVisitShellClass(pokemonId: string | null, tab: string): string | undefined {
  if (pokemonId != null || tab !== "build") return undefined;
  return FIRST_VISIT_FADE_CLASS;
}

/**
 * Inline animation duration for the first-visit shell.
 *
 * Duration lives here so the stylesheet does not hard-code a second copy.
 * Reduced-motion users never get the animation name, so this duration is unused.
 *
 * @param pokemonId - Pokémon already on the loadout, or null on the empty landing.
 * @param tab - Tab restored for this visit. Only `"build"` is the Select a Pokémon page.
 */
export function firstVisitFadeStyle(
  pokemonId: string | null,
  tab: string,
): { animationDuration: string } | undefined {
  if (pokemonId != null || tab !== "build") return undefined;
  return { animationDuration: `${FIRST_VISIT_FADE_MS}ms` };
}
