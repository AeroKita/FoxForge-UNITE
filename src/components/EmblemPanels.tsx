import { useMemo } from "react";
import { emblemById, setBonuses } from "../data/gameData";
import {
  deriveEmblemLoadoutImpact,
  type EmblemLoadoutImpact,
} from "../engine/emblemSearch/pokemonScore";
import type { EmblemColor, EmblemGrade, EmblemSlot, Pokemon } from "../types";
import { emblemImpactRows, emblemOocMoveGain, equippedSetRows } from "../ui/emblemWheel";
import { EmblemWheel } from "./EmblemWheel";
import { EquippedSets } from "./EquippedSets";
import { EquippedStats } from "./EquippedStats";

function useEmblemPanelData({
  picks,
  pokemon,
  level,
  impact: impactProp,
}: {
  picks: { emblemId: string; grade: EmblemGrade }[];
  pokemon: Pokemon | null;
  level: number;
  impact?: EmblemLoadoutImpact | null;
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
  const oocGain = useMemo(() => emblemOocMoveGain(impact), [impact]);

  return { setRows, statRows, oocGain };
}

export function EmblemPanels({
  picks,
  pokemon,
  level,
  impact,
  onRowClick,
  className,
}: {
  picks: { emblemId: string; grade: EmblemGrade }[];
  pokemon: Pokemon | null;
  level: number;
  impact?: EmblemLoadoutImpact | null;
  onRowClick?: (color: EmblemColor) => void;
  className?: string;
}) {
  const { setRows, statRows, oocGain } = useEmblemPanelData({
    picks,
    pokemon,
    level,
    impact,
  });

  return (
    <div className={["flex flex-col gap-4", className].filter(Boolean).join(" ")}>
      <EquippedSets rows={setRows} onRowClick={onRowClick} />
      <EquippedStats rows={statRows} oocGain={oocGain} />
    </div>
  );
}

/** Read-only small wheel, set rows, and compact gains. Row on sm+, stack on phones. */
export function EmblemPreview({
  slots,
  picks,
  pokemon,
  level,
  impact,
  onRowClick,
}: {
  slots: (EmblemSlot | null)[];
  picks: { emblemId: string; grade: EmblemGrade }[];
  pokemon: Pokemon | null;
  level: number;
  impact?: EmblemLoadoutImpact | null;
  onRowClick?: (color: EmblemColor) => void;
}) {
  const { setRows, statRows, oocGain } = useEmblemPanelData({
    picks,
    pokemon,
    level,
    impact,
  });

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
      <EmblemWheel size="sm" slots={slots} />
      <div className="min-w-0 w-full flex-1">
        <EquippedSets rows={setRows} onRowClick={onRowClick} />
      </div>
      <div className="w-full shrink-0 sm:w-40">
        <EquippedStats rows={statRows} oocGain={oocGain} />
      </div>
    </div>
  );
}
