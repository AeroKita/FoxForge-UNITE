import type { EmblemColor } from "../types";

/**
 * Overlay drawn on an emblem face in Builds, Loadout, and optimizer results.
 * Color dots stay; grade is visible on the emblem art, so letter chips are not a kind.
 */
export type EmblemFaceOverlay = { kind: "color-dot"; color: EmblemColor };

/**
 * Overlays for an emblem face. Order matches `emblem.colors`.
 */
export function emblemFaceOverlays(colors: EmblemColor[]): EmblemFaceOverlay[] {
  return colors.map((color) => ({ kind: "color-dot", color }));
}
