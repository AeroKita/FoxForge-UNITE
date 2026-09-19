import { useMemo } from "react";
import { emblemById, setBonuses } from "../data/gameData";
import {
  deriveEmblemLoadoutImpact,
  type EmblemLoadoutImpact,
} from "../engine/emblemSearch/pokemonScore";
import type { EmblemGrade, EmblemColor, Pokemon } from "../types";
import { emblemImpactRows, equippedSetRows } from "../ui/emblemWheel";
import { EquippedSets } from "./EquippedSets";
import { EquippedStats } from "./EquippedStats";

export function EmblemPanels({
  picks,
  pokemon,
  level,
  impact: impactProp,
  onRowClick,
}: {
  picks: { emblemId: string; grade: EmblemGrade }[];
  pokemon: Pokemon | null;
  level: number;
  impact?: EmblemLoadoutImpact | null;
  onRowClick?: (color: EmblemColor) => void;
}) {
  const slots = useMemo(
    () =>
      picks
        .map((p) => {
          const emblem = emblemById.get(p.emblemId);
          return emblem ? { emblem, grade: p.grade } : null;
        })
        .filter((s): s is NonNullable<typeof s> => s != null),
    [picks],
  );

  const setRows = useMemo(() => equippedSetRows(slots, setBonuses), [slots]);

  const impact = useMemo(() => {
    if (impactProp !== undefined) return impactProp;
    if (!pokemon || slots.length === 0) return null;
    return deriveEmblemLoadoutImpact(pokemon, level, picks, setBonuses);
  }, [impactProp, pokemon, level, picks, slots.length]);

  const statRows = useMemo(() => emblemImpactRows(impact), [impact]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <EquippedSets rows={setRows} onRowClick={onRowClick} />
      <EquippedStats
        rows={statRows}
        setBonuses={impact?.emblemLoadout.activeSetBonuses ?? []}
        oocMoveSpeed={impact?.oocMoveSpeed}
      />
    </div>
  );
}
