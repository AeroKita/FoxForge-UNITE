import type { Emblem, EmblemGrade } from "../types";
import { asset } from "../ui/asset";
import { emblemIconForGrade } from "../ui/emblemIcon";
import { EmblemFace } from "./EmblemFace";
import { Tooltip } from "./Tooltip";
import { emblemTip } from "./tips";

/**
 * Wrapping 64px coins with color-glyph badges and hover/long-press tips.
 * Used by the Builds card and Optimize results.
 */
export function EmblemCoinRow({ slots }: { slots: { emblem: Emblem; grade: EmblemGrade }[] }) {
  if (slots.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {slots.map(({ emblem, grade }, i) => (
        <Tooltip key={`${emblem.id}:${grade}:${i}`} content={emblemTip(emblem, grade)}>
          <EmblemFace
            src={asset(emblemIconForGrade(emblem, grade))}
            alt={emblem.pokemonName}
            colors={emblem.colors}
          />
        </Tooltip>
      ))}
    </div>
  );
}
