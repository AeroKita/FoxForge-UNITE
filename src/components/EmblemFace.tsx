import type { EmblemColor } from "../types";
import { emblemFaceOverlays } from "../ui/emblemFace";
import { SetGlyph } from "./SetGlyph";

interface EmblemFaceProps {
  src: string;
  alt: string;
  colors: EmblemColor[];
  /** Tailwind size classes for the emblem image. */
  sizeClass?: string;
  /** Tailwind size classes for each color glyph. */
  glyphClass?: string;
  /** Hide color glyphs (small wheels). */
  showGlyphs?: boolean;
}

/**
 * Emblem art plus color-set glyphs. Grade letter chips are omitted; the frame
 * color on the art is enough.
 */
export function EmblemFace({
  src,
  alt,
  colors,
  sizeClass = "h-16 w-16",
  glyphClass = "h-3.5 w-3.5",
  showGlyphs = true,
}: EmblemFaceProps) {
  return (
    <span className="relative inline-block">
      <img src={src} alt={alt} className={`${sizeClass} object-contain`} />
      {showGlyphs && (
        <span className="absolute -left-0.5 -top-0.5 flex gap-0.5">
          {emblemFaceOverlays(colors).map((overlay) => (
            <SetGlyph key={overlay.color} color={overlay.color} sizeClass={glyphClass} />
          ))}
        </span>
      )}
    </span>
  );
}
