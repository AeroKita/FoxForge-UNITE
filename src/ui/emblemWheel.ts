import type { EmblemLoadoutImpact } from "../engine/emblemSearch/pokemonScore";
import { MAX_EMBLEM_SLOTS } from "../engine/emblems";
import type { EmblemColor, EmblemSetBonus, EmblemSlot, StatBlock } from "../types";
import type { SetInfoRow } from "./emblemSets";

export interface WheelPosition {
  left: number;
  top: number;
}

export interface EquippedSetRow {
  color: EmblemColor;
  count: number;
  tiers: { count: number; value: number; reached: boolean }[];
  active: { count: number; value: number } | null;
  next: number | null;
  info: SetInfoRow;
}

export interface ImpactRow {
  key: keyof StatBlock;
  label: string;
  before: string;
  after: string;
  delta: string;
  sign: "pos" | "neg";
}

/** Index 0 at 12 o'clock, clockwise. Stub until Part 5. */
export function wheelSlotPositions(_count = MAX_EMBLEM_SLOTS, _radiusPct = 42): WheelPosition[] {
  return [];
}

export function equippedSetRows(
  _slots: EmblemSlot[],
  _setBonuses: EmblemSetBonus[],
): EquippedSetRow[] {
  return [];
}

export function emblemImpactRows(_impact: EmblemLoadoutImpact | null): ImpactRow[] {
  return [];
}
