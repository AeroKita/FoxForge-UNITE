import { useMemo } from "react";
import { emblemById, setBonuses } from "../data/gameData";
import { sumEmblemFlats } from "../engine/emblems";
import { deriveEmblemLoadoutImpact } from "../engine/emblemSearch/pokemonScore";
import type { EmblemGrade, Pokemon } from "../types";
import {
  emblemFlatRows,
  emblemImpactRows,
  emblemOocMoveGain,
  equippedSetRows,
  slotsFromPicks,
} from "../ui/emblemWheel";

/**
 * Equipped Sets rows plus Equipped Stats for the current emblem picks.
 * `statRows` are gains/losses vs no emblems (`emblemDelta`); `flatRows` are
 * coin totals with no color-set % applied.
 */
export function useEmblemPanelData({
  picks,
  pokemon,
  level,
  precise = false,
}: {
  picks: { emblemId: string; grade: EmblemGrade }[];
  pokemon: Pokemon | null;
  level: number;
  precise?: boolean;
}) {
  const slots = useMemo(() => slotsFromPicks(picks, (id) => emblemById.get(id)), [picks]);

  const setRows = useMemo(() => equippedSetRows(slots, setBonuses), [slots]);

  const impact = useMemo(() => {
    if (!pokemon || slots.length === 0) return null;
    return deriveEmblemLoadoutImpact(pokemon, level, picks, setBonuses);
  }, [pokemon, level, picks, slots.length]);

  const statRows = useMemo(() => emblemImpactRows(impact), [impact]);
  const flatRows = useMemo(
    () => emblemFlatRows(slots.length === 0 ? null : sumEmblemFlats(slots), precise),
    [slots, precise],
  );
  const oocGain = useMemo(() => emblemOocMoveGain(impact), [impact]);

  return { setRows, statRows, flatRows, oocGain };
}
