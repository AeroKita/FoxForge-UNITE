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
  /** Hide color glyphs. */
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
    <span className={`relative inline-block ${sizeClass}`}>
      <img src={src} alt={alt} className="h-full w-full object-contain" loading="lazy" />
      {showGlyphs && (
        <span className="absolute -bottom-0.5 -right-0.5 flex gap-px rounded-full bg-surface/95 p-px shadow ring-1 ring-line/60">
          {emblemFaceOverlays(colors).map((overlay) => (
            <SetGlyph key={overlay.color} color={overlay.color} sizeClass={glyphClass} />
          ))}
        </span>
      )}
    </span>
  );
}
