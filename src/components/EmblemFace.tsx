import type { EmblemColor } from "../types";
import { EMBLEM_COLOR_HEX } from "../ui/colors";
import { emblemFaceOverlays } from "../ui/emblemFace";

interface EmblemFaceProps {
  src: string;
  alt: string;
  colors: EmblemColor[];
  /** Tailwind size classes for the emblem image. */
  sizeClass?: string;
  /** Tailwind size classes for each color dot. */
  colorDotClass?: string;
}

/**
 * Emblem art plus color dots. Grade letter chips are omitted; the frame color on the art is enough.
 */
export function EmblemFace({
  src,
  alt,
  colors,
  sizeClass = "h-16 w-16",
  colorDotClass = "h-2 w-2",
}: EmblemFaceProps) {
  return (
    <span className="relative inline-block">
      <img src={src} alt={alt} className={`${sizeClass} object-contain`} />
      <span className="absolute -left-0.5 -top-0.5 flex gap-0.5">
        {emblemFaceOverlays(colors).map((overlay) => (
          <span
            key={overlay.color}
            className={`${colorDotClass} rounded-full ring-1 ring-white`}
            style={{ background: EMBLEM_COLOR_HEX[overlay.color] }}
          />
        ))}
      </span>
    </span>
  );
}
