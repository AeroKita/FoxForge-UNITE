import type { EmblemColor } from "../types";
import { asset } from "../ui/asset";
import { emblemSetGlyphAsset } from "../ui/emblemIcon";

export function SetGlyph({
  color,
  sizeClass = "h-4 w-4",
}: {
  color: EmblemColor;
  sizeClass?: string;
}) {
  return (
    <img
      src={asset(emblemSetGlyphAsset(color))}
      alt={color}
      className={sizeClass}
      draggable={false}
    />
  );
}
